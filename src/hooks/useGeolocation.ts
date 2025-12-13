
import { useState, useEffect, useRef } from 'react';
import { location } from '@/lib/api';

interface LocationState {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    timestamp: number;
    batteryLevel?: number;
}


interface UseGeolocationReturn {
    currentLocation: LocationState | null;
    isTracking: boolean;
    error: string | null;
    trackingStartTime: number | null;
    totalDistance: number;
    startTracking: () => Promise<void>;
    stopTracking: () => Promise<void>;
    initLocation: () => Promise<void>;
}

export function useGeolocation(): UseGeolocationReturn {
    const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null);
    const [totalDistance, setTotalDistance] = useState(0);
    const [batch, setBatch] = useState<LocationState[]>([]);

    const watchId = useRef<number | null>(null);
    const batchRef = useRef<LocationState[]>([]);
    const syncInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load persisted state on mount
    useEffect(() => {
        const persistedTracking = localStorage.getItem('isTracking') === 'true';
        const persistedStartTime = localStorage.getItem('trackingStartTime');
        const persistedDistance = localStorage.getItem('totalDistance');

        if (persistedDistance) {
            setTotalDistance(parseFloat(persistedDistance));
        }

        if (persistedTracking) {
            console.log('Resuming tracking session...');
            if (persistedStartTime) {
                setTrackingStartTime(parseInt(persistedStartTime, 10));
            }
            startTracking(true); // resume flag
        } else {
            initLocation(); // Just get current location once for map
        }

        return () => {
            // Cleanup if component unmounts but keep tracking active in persistent state?
            // Actually, if we unmount (e.g. reload), we lose the watchId.
            // We need to restart it on mount.
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
            if (syncInterval.current) {
                clearInterval(syncInterval.current);
            }
        };
    }, []);

    useEffect(() => {
        batchRef.current = batch;
    }, [batch]);

    const initLocation = async () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCurrentLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: pos.timestamp,
                    speed: pos.coords.speed,
                    heading: pos.coords.heading
                });
            },
            (err) => console.warn(err),
            { enableHighAccuracy: true }
        );
    };

    const startTracking = async (isResuming = false) => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported');
            return;
        }

        try {
            if (!isResuming) {
                await location.startTracking();
                const now = Date.now();
                setTrackingStartTime(now);
                localStorage.setItem('trackingStartTime', now.toString());
            }

            setIsTracking(true);
            localStorage.setItem('isTracking', 'true');
            setError(null);

            // Setup GPS Watch
            watchId.current = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude, accuracy, speed, heading } = position.coords;

                    let batteryLevel = 0;
                    try {
                        // @ts-ignore
                        const battery = await navigator.getBattery();
                        batteryLevel = Math.round(battery.level * 100);
                    } catch (e) {
                        // Battery API not supported
                    }

                    const newLocation: LocationState = {
                        latitude,
                        longitude,
                        accuracy,
                        speed,
                        heading,
                        timestamp: position.timestamp,
                        batteryLevel
                    };

                    setCurrentLocation(prev => {
                        if (prev) {
                            const R = 6371;
                            const dLat = (latitude - prev.latitude) * Math.PI / 180;
                            const dLon = (longitude - prev.longitude) * Math.PI / 180;
                            const a =
                                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                Math.cos(prev.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                                Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            const d = R * c;

                            if (accuracy < 50 && d > 0.005) {
                                setTotalDistance(old => {
                                    const next = old + d;
                                    localStorage.setItem('totalDistance', next.toString());
                                    return next;
                                });
                            }
                        }
                        return newLocation;
                    });
                    setBatch(prev => {
                        const updated = [...prev, newLocation];
                        batchRef.current = updated;
                        return updated;
                    });
                },
                (err) => setError(err.message),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );

            // Setup Sync Interval (every 30s)
            syncInterval.current = setInterval(async () => {
                const locationsToSync = batchRef.current;
                if (locationsToSync.length > 0) {
                    try {
                        await location.updateLocation(locationsToSync);
                        // Filter out synced locations based on timestamp, or just clear. 
                        // Clearing is safer if we assume all current batch was sent.
                        // Ideally we'd remove only items present at start of call.
                        // Simplified:
                        setBatch([]);
                        batchRef.current = [];
                    } catch (e) {
                        console.error('Failed to sync locations', e);
                    }
                }
            }, 30000);

        } catch (e) {
            setError('Failed to start tracking session');
            console.error(e);
            setIsTracking(false);
            localStorage.removeItem('isTracking');
            localStorage.removeItem('trackingStartTime');
        }
    };

    const stopTracking = async () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }

        if (syncInterval.current) {
            clearInterval(syncInterval.current);
            syncInterval.current = null;
        }

        // Final sync
        if (batchRef.current.length > 0) {
            try {
                await location.updateLocation(batchRef.current);
            } catch (e) {
                console.error('Final sync failed', e);
            }
        }

        try {
            if (isTracking) {
                await location.stopTracking({ distance: totalDistance });
            }
        } catch (e) {
            console.log('Error stopping session', e);
        }

        setIsTracking(false);
        setTrackingStartTime(null);
        setTotalDistance(0);
        localStorage.removeItem('isTracking');
        localStorage.removeItem('trackingStartTime');
        localStorage.removeItem('totalDistance');
        setBatch([]);
    };

    return {
        currentLocation,
        isTracking,
        trackingStartTime,
        totalDistance,
        error,
        startTracking,
        stopTracking,
        initLocation
    };
}


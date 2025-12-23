import { useState, useEffect, useRef, useCallback } from 'react';
import { location } from '@/lib/api';

interface LocationUpdate {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number | null;
    heading?: number | null;
    timestamp: number;
    batteryLevel?: number;
    networkStatus?: string;
}

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
    backgroundTrackingEnabled: boolean;
    startTracking: () => Promise<void>;
    stopTracking: () => Promise<void>;
    initLocation: () => void;
    enableBackgroundTracking: () => Promise<boolean>;
    disableBackgroundTracking: () => Promise<void>;
}

const SYNC_INTERVAL_MS = 30000; // 30 seconds
const MIN_DISTANCE_THRESHOLD_KM = 0.005; // 5 meters
const MIN_ACCURACY_THRESHOLD = 50; // meters

// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function getBatteryLevel(): Promise<number | undefined> {
    try {
        // @ts-ignore - Battery API is not in TypeScript types
        const battery = await navigator.getBattery?.();
        return battery ? Math.round(battery.level * 100) : undefined;
    } catch {
        return undefined;
    }
}

// Register and manage service worker for background tracking
async function registerBackgroundTrackingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw-background-tracking.js', {
            scope: '/'
        });

        console.log('Background tracking service worker registered:', registration);

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        return registration;
    } catch (error) {
        console.error('Service worker registration failed:', error);
        return null;
    }
}

export function useGeolocation(): UseGeolocationReturn {
    const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null);
    const [totalDistance, setTotalDistance] = useState(0);
    const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false);

    const watchIdRef = useRef<number | null>(null);
    const batchRef = useRef<LocationUpdate[]>([]);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const previousLocationRef = useRef<LocationState | null>(null);
    const isInitializedRef = useRef(false);
    const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);

    // Sync locations to server
    const syncLocations = useCallback(async () => {
        const locationsToSync = [...batchRef.current];
        if (locationsToSync.length === 0) return;

        try {
            await location.updateLocation(locationsToSync);
            batchRef.current = [];
        } catch (e) {
            // Keep locations in batch for next sync attempt
            console.error('Sync failed, will retry');
        }
    }, []);

    // Clean up function
    const cleanup = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // Initialize location once (for map display)
    const initLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const batteryLevel = await getBatteryLevel();
                setCurrentLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: pos.timestamp,
                    speed: pos.coords.speed,
                    heading: pos.coords.heading,
                    batteryLevel,
                });
                setError(null);
            },
            (err) => {
                setError(err.message);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, []);

    // Enable background tracking
    const enableBackgroundTracking = useCallback(async (): Promise<boolean> => {
        try {
            // Request persistent storage
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                console.log('Persistent storage granted:', isPersisted);
            }

            // Register service worker
            const registration = await registerBackgroundTrackingServiceWorker();
            if (!registration) {
                setError('Failed to enable background tracking');
                return false;
            }

            serviceWorkerRef.current = registration;

            // Request background sync permission
            if ('sync' in registration) {
                try {
                    await registration.sync.register('location-sync');
                    console.log('Background sync registered');
                } catch (err) {
                    console.log('Background sync registration failed:', err);
                }
            }

            // Send message to service worker to start background tracking
            if (registration.active) {
                registration.active.postMessage({
                    type: 'START_BACKGROUND_TRACKING',
                    config: {
                        interval: SYNC_INTERVAL_MS
                    }
                });
            }

            setBackgroundTrackingEnabled(true);
            localStorage.setItem('backgroundTrackingEnabled', 'true');

            return true;
        } catch (error) {
            console.error('Failed to enable background tracking:', error);
            setError('Failed to enable background tracking');
            return false;
        }
    }, []);

    // Disable background tracking
    const disableBackgroundTracking = useCallback(async () => {
        if (serviceWorkerRef.current?.active) {
            serviceWorkerRef.current.active.postMessage({
                type: 'STOP_BACKGROUND_TRACKING'
            });
        }

        setBackgroundTrackingEnabled(false);
        localStorage.removeItem('backgroundTrackingEnabled');
    }, []);

    // Listen for messages from service worker
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'REQUEST_LOCATION') {
                // Service worker is requesting current location
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const batteryLevel = await getBatteryLevel();
                        const locationData = {
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                            speed: pos.coords.speed,
                            heading: pos.coords.heading,
                            timestamp: pos.timestamp,
                            batteryLevel,
                            networkStatus: navigator.onLine ? 'online' : 'offline'
                        };

                        // Send location to service worker
                        if (serviceWorkerRef.current?.active) {
                            serviceWorkerRef.current.active.postMessage({
                                type: 'LOCATION_UPDATE',
                                location: locationData
                            });
                        }
                    },
                    (err) => console.error('Failed to get location for SW:', err),
                    { enableHighAccuracy: true }
                );
            } else if (event.data.type === 'LOCATIONS_SYNCED') {
                console.log(`${event.data.count} locations synced by service worker`);
            }
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);

        return () => {
            navigator.serviceWorker.removeEventListener('message', handleMessage);
        };
    }, []);

    // Check for existing session on mount
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const checkSession = async () => {
            // Check localStorage for persisted tracking state
            const wasTracking = localStorage.getItem('isTracking') === 'true';
            const savedStartTime = localStorage.getItem('trackingStartTime');
            const savedDistance = localStorage.getItem('totalDistance');
            const bgTrackingEnabled = localStorage.getItem('backgroundTrackingEnabled') === 'true';

            if (savedDistance) {
                setTotalDistance(parseFloat(savedDistance));
            }

            // Restore background tracking if it was enabled
            if (bgTrackingEnabled) {
                await enableBackgroundTracking();
            }

            if (wasTracking && savedStartTime) {
                // Resume tracking
                setTrackingStartTime(parseInt(savedStartTime, 10));
                startTrackingInternal(true);
            } else {
                // Just get current location for map
                initLocation();
            }
        };

        checkSession();

        return cleanup;
    }, [cleanup, initLocation, enableBackgroundTracking]);

    // Internal tracking start (can resume)
    const startTrackingInternal = async (isResuming = false) => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported');
            return;
        }

        try {
            if (!isResuming) {
                // Create new session on server
                await location.startTracking();
                const now = Date.now();
                setTrackingStartTime(now);
                localStorage.setItem('trackingStartTime', now.toString());
                setTotalDistance(0);
                localStorage.setItem('totalDistance', '0');
            }

            setIsTracking(true);
            localStorage.setItem('isTracking', 'true');
            setError(null);
            batchRef.current = [];

            // Start GPS watch
            watchIdRef.current = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude, accuracy, speed, heading } = position.coords;
                    const batteryLevel = await getBatteryLevel();

                    const newLocation: LocationState = {
                        latitude,
                        longitude,
                        accuracy,
                        speed,
                        heading,
                        timestamp: position.timestamp,
                        batteryLevel,
                    };

                    // Update distance if accuracy is good enough
                    const prevLoc = previousLocationRef.current;
                    if (prevLoc && accuracy < MIN_ACCURACY_THRESHOLD) {
                        const dist = calculateDistance(
                            prevLoc.latitude, prevLoc.longitude,
                            latitude, longitude
                        );
                        if (dist > MIN_DISTANCE_THRESHOLD_KM) {
                            setTotalDistance(prev => {
                                const next = prev + dist;
                                localStorage.setItem('totalDistance', next.toString());
                                return next;
                            });
                        }
                    }

                    previousLocationRef.current = newLocation;
                    setCurrentLocation(newLocation);

                    // Add to batch
                    batchRef.current.push({
                        latitude,
                        longitude,
                        accuracy,
                        speed,
                        heading,
                        timestamp: position.timestamp,
                        batteryLevel,
                        networkStatus: navigator.onLine ? 'online' : 'offline',
                    });
                },
                (err) => {
                    setError(err.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );

            // Setup sync interval
            syncIntervalRef.current = setInterval(syncLocations, SYNC_INTERVAL_MS);

        } catch (e: any) {
            setError(e.message || 'Failed to start tracking');
            setIsTracking(false);
            localStorage.removeItem('isTracking');
            localStorage.removeItem('trackingStartTime');
        }
    };

    // Public start tracking
    const startTracking = useCallback(async () => {
        await startTrackingInternal(false);
    }, []);

    // Stop tracking
    const stopTracking = useCallback(async () => {
        cleanup();

        // Final sync
        if (batchRef.current.length > 0) {
            try {
                await location.updateLocation(batchRef.current);
            } catch {
                // Log but don't fail
            }
        }

        // Stop session on server
        try {
            await location.stopTracking({ distance: totalDistance });
        } catch {
            // Session might already be stopped
        }

        // Clear state
        setIsTracking(false);
        setTrackingStartTime(null);
        setTotalDistance(0);
        batchRef.current = [];
        previousLocationRef.current = null;

        // Clear persisted state
        localStorage.removeItem('isTracking');
        localStorage.removeItem('trackingStartTime');
        localStorage.removeItem('totalDistance');
    }, [cleanup, totalDistance]);

    return {
        currentLocation,
        isTracking,
        trackingStartTime,
        totalDistance,
        error,
        backgroundTrackingEnabled,
        startTracking,
        stopTracking,
        initLocation,
        enableBackgroundTracking,
        disableBackgroundTracking,
    };
}

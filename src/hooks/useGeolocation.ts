import { useState, useEffect, useRef, useCallback } from 'react';
import { location } from '@/lib/api';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

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
    startTracking: () => Promise<void>;
    stopTracking: () => Promise<void>;
    initLocation: () => void;
    requestPermissions: () => Promise<boolean>;
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

export function useGeolocation(): UseGeolocationReturn {
    const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trackingStartTime, setTrackingStartTime] = useState<number | null>(null);
    const [totalDistance, setTotalDistance] = useState(0);

    const watchIdRef = useRef<string | number | null>(null);
    const batchRef = useRef<LocationUpdate[]>([]);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const previousLocationRef = useRef<LocationState | null>(null);
    const isInitializedRef = useRef(false);
    const isNativeRef = useRef(Capacitor.isNativePlatform());

    // Internal wake lock ref
    const wakeLockRef = useRef<any>(null);

    // Sync locations to server
    const syncLocations = useCallback(async () => {
        const locationsToSync = [...batchRef.current];
        if (locationsToSync.length === 0) return;

        try {
            await location.updateLocation(locationsToSync);
            batchRef.current = [];
            console.log(`Synced ${locationsToSync.length} locations to server`);
        } catch (e) {
            console.error('Sync failed, will retry:', e);
            // Keep locations in batch for next sync attempt
        }
    }, []);

    // Clean up function
    const cleanup = useCallback(async () => {
        if (isNativeRef.current && watchIdRef.current) {
            try {
                await Geolocation.clearWatch({ id: watchIdRef.current as string });
            } catch (e) {
                console.error('Error clearing native watch:', e);
            }
            watchIdRef.current = null;
        } else if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current as number);
            watchIdRef.current = null;
        }

        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // Request permissions (especially for native)
    const requestPermissions = useCallback(async (): Promise<boolean> => {
        if (!isNativeRef.current) {
            // Browser - permissions are requested on first geolocation call
            return true;
        }

        try {
            let permissions = await Geolocation.checkPermissions();
            console.log('Current permissions:', permissions);

            if (permissions.location !== 'granted') {
                permissions = await Geolocation.requestPermissions();
                console.log('Requested permissions:', permissions);
            }

            if (permissions.location === 'denied') {
                setError('Location permission denied. Please enable in Settings.');
                return false;
            }

            return true;
        } catch (e: any) {
            console.error('Permission error:', e);
            setError(e.message || 'Failed to get location permissions');
            return false;
        }
    }, []);

    // Process a position update
    const processPosition = useCallback(async (position: Position | GeolocationPosition) => {
        const coords = position.coords;
        const batteryLevel = await getBatteryLevel();

        const newLocation: LocationState = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy || 0,
            speed: coords.speed,
            heading: coords.heading,
            timestamp: position.timestamp,
            batteryLevel,
        };

        // Update distance if accuracy is good enough
        const prevLoc = previousLocationRef.current;
        if (prevLoc && newLocation.accuracy < MIN_ACCURACY_THRESHOLD) {
            const dist = calculateDistance(
                prevLoc.latitude, prevLoc.longitude,
                newLocation.latitude, newLocation.longitude
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
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy || undefined,
            speed: coords.speed,
            heading: coords.heading,
            timestamp: position.timestamp,
            batteryLevel,
            networkStatus: navigator.onLine ? 'online' : 'offline',
        });
    }, []);

    // Initialize location once (for map display)
    const initLocation = useCallback(async () => {
        setError(null);

        try {
            if (isNativeRef.current) {
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 15000
                });
                await processPosition(position);
            } else {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        await processPosition(pos);
                    },
                    (err) => setError(err.message),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            }
        } catch (e: any) {
            setError(e.message || 'Failed to get location');
        }
    }, [processPosition]);

    // Request Wake Lock
    const requestWakeLock = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                console.log('Wake Lock active');

                wakeLockRef.current.addEventListener('release', () => {
                    console.log('Wake Lock released');
                });
            } catch (err: any) {
                console.error(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        }
    }, []);

    // Start/Stop Foreground Service
    const startForegroundService = useCallback(async () => {
        if (!isNativeRef.current || Capacitor.getPlatform() !== 'android') return;

        try {
            await ForegroundService.startForegroundService({
                id: 12345,
                body: 'Tracking your location in the background',
                title: 'LocTrack Active',
                smallIcon: 'ic_stat_location',
            });
            console.log('Foreground service started');
        } catch (e) {
            console.error('Failed to start foreground service:', e);
        }
    }, []);

    const stopForegroundService = useCallback(async () => {
        if (!isNativeRef.current || Capacitor.getPlatform() !== 'android') return;

        try {
            await ForegroundService.stopForegroundService();
            console.log('Foreground service stopped');
        } catch (e) {
            console.error('Failed to stop foreground service:', e);
        }
    }, []);

    // Start tracking
    const startTracking = useCallback(async () => {
        // Request permissions first
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            await requestWakeLock();
            await startForegroundService();

            // Create new session on server
            await location.startTracking();
            const now = Date.now();
            setTrackingStartTime(now);
            localStorage.setItem('trackingStartTime', now.toString());
            setTotalDistance(0);
            localStorage.setItem('totalDistance', '0');

            setIsTracking(true);
            localStorage.setItem('isTracking', 'true');
            setError(null);
            batchRef.current = [];

            // Start watching position
            if (isNativeRef.current) {
                // Use Capacitor Geolocation for native
                const watchId = await Geolocation.watchPosition(
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                    },
                    async (position, err) => {
                        if (err) {
                            console.error('Watch position error:', err);
                            return;
                        }
                        if (position) {
                            await processPosition(position);
                        }
                    }
                );
                watchIdRef.current = watchId;
            } else {
                // Use browser geolocation
                watchIdRef.current = navigator.geolocation.watchPosition(
                    async (position) => {
                        await processPosition(position);
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
            }

            // Setup sync interval
            syncIntervalRef.current = setInterval(syncLocations, SYNC_INTERVAL_MS);

        } catch (e: any) {
            setError(e.message || 'Failed to start tracking');
            setIsTracking(false);
            localStorage.removeItem('isTracking');
            localStorage.removeItem('trackingStartTime');
        }
    }, [requestPermissions, requestWakeLock, startForegroundService, processPosition, syncLocations]);

    // Stop tracking
    const stopTracking = useCallback(async () => {
        await cleanup();

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

        await stopForegroundService();

        // Release Wake Lock
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (e) {
                console.error('Error releasing wake lock:', e);
            }
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
    }, [cleanup, totalDistance, stopForegroundService]);

    // Re-acquire wake lock on visibility change if tracking
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isTracking && !wakeLockRef.current) {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isTracking, requestWakeLock]);

    // Check for existing session on mount
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const checkSession = async () => {
            const wasTracking = localStorage.getItem('isTracking') === 'true';
            const savedStartTime = localStorage.getItem('trackingStartTime');
            const savedDistance = localStorage.getItem('totalDistance');

            if (savedDistance) {
                setTotalDistance(parseFloat(savedDistance));
            }

            if (wasTracking && savedStartTime) {
                // Resume tracking
                console.log('Resuming previous tracking session...');
                setTrackingStartTime(parseInt(savedStartTime, 10));

                // Request permissions and start watching
                const hasPermission = await requestPermissions();
                if (hasPermission) {
                    setIsTracking(true);
                    await startForegroundService();
                    await requestWakeLock();

                    if (isNativeRef.current) {
                        const watchId = await Geolocation.watchPosition(
                            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                            async (position) => {
                                if (position) await processPosition(position);
                            }
                        );
                        watchIdRef.current = watchId;
                    } else {
                        watchIdRef.current = navigator.geolocation.watchPosition(
                            async (pos) => await processPosition(pos),
                            (err) => setError(err.message),
                            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                        );
                    }

                    syncIntervalRef.current = setInterval(syncLocations, SYNC_INTERVAL_MS);
                }
            } else {
                // Just get current location for map
                initLocation();
            }
        };

        checkSession();

        return () => {
            cleanup();
        };
    }, []);

    return {
        currentLocation,
        isTracking,
        trackingStartTime,
        totalDistance,
        error,
        startTracking,
        stopTracking,
        initLocation,
        requestPermissions,
    };
}

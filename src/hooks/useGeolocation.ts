import { useState, useEffect, useRef, useCallback } from 'react';
import { location } from '@/lib/api';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
import BackgroundLocation from '@/lib/BackgroundLocation';

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
    permissionStatus: {
        location: boolean;
        backgroundLocation: boolean;
        activityRecognition: boolean;
        batteryOptimizationExempt: boolean;
    };
}

// Sync settings for browser fallback
const SYNC_INTERVAL_MS = 15000; // 15 seconds
const MIN_DISTANCE_THRESHOLD_KM = 0.005; // 5 meters
const MIN_ACCURACY_THRESHOLD = 50; // meters

// Production API URL
const API_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
        ? 'https://loctrack-api.onrender.com/api'
        : 'http://localhost:3000/api');

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
    const [permissionStatus, setPermissionStatus] = useState({
        location: false,
        backgroundLocation: false,
        activityRecognition: false,
        batteryOptimizationExempt: false,
    });

    const watchIdRef = useRef<string | number | null>(null);
    const batchRef = useRef<LocationUpdate[]>([]);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const previousLocationRef = useRef<LocationState | null>(null);
    const isInitializedRef = useRef(false);
    const isNativeRef = useRef(Capacitor.isNativePlatform());
    const backgroundServiceActiveRef = useRef(false);

    // Internal wake lock ref
    const wakeLockRef = useRef<any>(null);

    // Check permission status
    const checkPermissionStatus = useCallback(async () => {
        if (!isNativeRef.current) return;

        try {
            const permissions = await BackgroundLocation.checkPermissions();
            setPermissionStatus({
                location: permissions.location === 'granted',
                backgroundLocation: permissions.backgroundLocation === 'granted',
                activityRecognition: permissions.activityRecognition === 'granted',
                batteryOptimizationExempt: permissions.batteryOptimizationExempt || false,
            });
        } catch (e) {
            console.warn('Failed to check permissions:', e);
        }
    }, []);

    // Sync locations to server (browser fallback)
    const syncLocations = useCallback(async () => {
        const locationsToSync = [...batchRef.current];
        if (locationsToSync.length === 0) return;

        try {
            await location.updateLocation(locationsToSync);
            batchRef.current = [];
            console.log(`Synced ${locationsToSync.length} locations to server`);
        } catch (e) {
            console.error('Sync failed, will retry:', e);
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

    // Request permissions (production-grade)
    const requestPermissions = useCallback(async (): Promise<boolean> => {
        if (!isNativeRef.current) {
            return true; // Browser permissions requested on first use
        }

        try {
            console.log('Requesting production-grade permissions...');

            // Use the plugin to request all permissions in sequence
            const permissions = await BackgroundLocation.requestPermissions();
            console.log('Permission result:', permissions);

            setPermissionStatus({
                location: permissions.location === 'granted',
                backgroundLocation: permissions.backgroundLocation === 'granted',
                activityRecognition: permissions.activityRecognition === 'granted',
                batteryOptimizationExempt: false, // Will be checked separately
            });

            if (permissions.location === 'denied') {
                setError('Location permission denied. Please enable in Settings.');
                return false;
            }

            if (permissions.backgroundLocation !== 'granted') {
                console.warn('Background location not granted - tracking may stop when app in background');
            }

            if (permissions.activityRecognition !== 'granted') {
                console.warn('Activity recognition not granted - smart tracking disabled');
            }

            // Check battery optimization separately
            const fullStatus = await BackgroundLocation.checkPermissions();
            setPermissionStatus(prev => ({
                ...prev,
                batteryOptimizationExempt: fullStatus.batteryOptimizationExempt || false,
            }));

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

        // Only add to batch if native service not handling sync
        if (!backgroundServiceActiveRef.current) {
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
        }
    }, []);

    // Initialize location once
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
                    async (pos) => await processPosition(pos),
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
            } catch (err: any) {
                console.error(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        }
    }, []);

    // Start tracking (Production-grade)
    const startTracking = useCallback(async () => {
        // Request all permissions first
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            await requestWakeLock();

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

            // On native platform, use the production-grade native service
            if (isNativeRef.current) {
                try {
                    const authToken = localStorage.getItem('token');
                    if (authToken) {
                        console.log('🚀 Starting production-grade background tracking...');

                        const result = await BackgroundLocation.startTracking({
                            authToken,
                            apiUrl: API_URL,
                        });

                        backgroundServiceActiveRef.current = true;
                        console.log('✅ Native service started:', result);

                        if (result.features) {
                            console.log('Enabled features:', result.features);
                        }
                    } else {
                        console.error('No auth token available');
                        throw new Error('Authentication required');
                    }
                } catch (bgError) {
                    console.error('Failed to start native service:', bgError);
                    backgroundServiceActiveRef.current = false;
                    // Continue with JS fallback
                }

                // JavaScript watch for UI updates
                const watchId = await Geolocation.watchPosition(
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                    async (position, err) => {
                        if (err) {
                            console.error('Watch error:', err);
                            return;
                        }
                        if (position) await processPosition(position);
                    }
                );
                watchIdRef.current = watchId;
            } else {
                // Browser fallback
                watchIdRef.current = navigator.geolocation.watchPosition(
                    async (position) => await processPosition(position),
                    (err) => setError(err.message),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            }

            // Setup sync interval for browser fallback
            if (!backgroundServiceActiveRef.current) {
                syncIntervalRef.current = setInterval(syncLocations, SYNC_INTERVAL_MS);
            }

        } catch (e: any) {
            setError(e.message || 'Failed to start tracking');
            setIsTracking(false);
            localStorage.removeItem('isTracking');
            localStorage.removeItem('trackingStartTime');
        }
    }, [requestPermissions, requestWakeLock, processPosition, syncLocations]);

    // Stop tracking
    const stopTracking = useCallback(async () => {
        await cleanup();

        // Stop the native background service
        if (isNativeRef.current) {
            try {
                await BackgroundLocation.stopTracking();
                console.log('✅ Native background service stopped');
            } catch (e) {
                console.error('Error stopping background service:', e);
            }
            backgroundServiceActiveRef.current = false;
        }

        // Final sync for browser-collected locations
        if (batchRef.current.length > 0) {
            try {
                await location.updateLocation(batchRef.current);
            } catch { /* ignore */ }
        }

        // Stop session on server
        try {
            await location.stopTracking({ distance: totalDistance });
        } catch { /* ignore */ }

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
    }, [cleanup, totalDistance]);

    // Re-acquire wake lock on visibility change
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                if (isTracking && !wakeLockRef.current) {
                    await requestWakeLock();
                }
                // Refresh permission status when app comes to foreground
                await checkPermissionStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isTracking, requestWakeLock, checkPermissionStatus]);

    // Check for existing session on mount
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const initializeTracking = async () => {
            // Check initial permission status
            await checkPermissionStatus();

            const wasTracking = localStorage.getItem('isTracking') === 'true';
            const savedStartTime = localStorage.getItem('trackingStartTime');
            const savedDistance = localStorage.getItem('totalDistance');

            if (savedDistance) {
                setTotalDistance(parseFloat(savedDistance));
            }

            // Check if native service is already running
            if (isNativeRef.current) {
                try {
                    const { isActive } = await BackgroundLocation.isTrackingActive();
                    if (isActive) {
                        console.log('📍 Native tracking already active, resuming UI...');
                        setIsTracking(true);
                        backgroundServiceActiveRef.current = true;

                        if (savedStartTime) {
                            setTrackingStartTime(parseInt(savedStartTime, 10));
                        }

                        // Start JS watch for UI updates
                        const watchId = await Geolocation.watchPosition(
                            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                            async (position) => {
                                if (position) await processPosition(position);
                            }
                        );
                        watchIdRef.current = watchId;
                        return;
                    }
                } catch (e) {
                    console.warn('Failed to check native tracking status:', e);
                }
            }

            if (wasTracking && savedStartTime) {
                // Resume tracking
                console.log('Resuming previous tracking session...');
                setTrackingStartTime(parseInt(savedStartTime, 10));

                const hasPermission = await requestPermissions();
                if (hasPermission) {
                    setIsTracking(true);
                    await requestWakeLock();

                    if (isNativeRef.current) {
                        try {
                            const authToken = localStorage.getItem('token');
                            if (authToken) {
                                await BackgroundLocation.startTracking({
                                    authToken,
                                    apiUrl: API_URL,
                                });
                                backgroundServiceActiveRef.current = true;
                            }
                        } catch (bgError) {
                            console.error('Failed to resume background service:', bgError);
                        }

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

                    if (!backgroundServiceActiveRef.current) {
                        syncIntervalRef.current = setInterval(syncLocations, SYNC_INTERVAL_MS);
                    }
                }
            } else {
                // Just get current location for map
                initLocation();
            }
        };

        initializeTracking();

        return () => { cleanup(); };
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
        permissionStatus,
    };
}

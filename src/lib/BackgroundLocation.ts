import { registerPlugin } from '@capacitor/core';

export interface BackgroundLocationPermissions {
    location: 'granted' | 'denied' | 'prompt';
    backgroundLocation: 'granted' | 'denied' | 'prompt';
    activityRecognition: 'granted' | 'denied' | 'prompt';
    notification: 'granted' | 'denied' | 'prompt';
    batteryOptimizationExempt?: boolean;
    isTracking?: boolean;
}

export interface TrackingFeatures {
    backgroundLocation: boolean;
    activityRecognition: boolean;
    batteryOptimizationExempt: boolean;
    bootRestart: boolean;
}

export interface StartTrackingResult {
    success: boolean;
    message: string;
    features?: TrackingFeatures;
}

export interface BackgroundLocationPlugin {
    /**
     * Start production-grade background location tracking
     * 
     * This starts a native foreground service that:
     * - Uses FusedLocationProviderClient for best accuracy
     * - Detects activity (walking, driving, stationary)
     * - Adjusts tracking interval based on activity
     * - Survives app being killed/swiped
     * - Restarts after device reboot
     */
    startTracking(options: {
        authToken: string;
        apiUrl?: string;
    }): Promise<StartTrackingResult>;

    /**
     * Stop background location tracking
     * Also clears the tracking enabled state
     */
    stopTracking(): Promise<{ success: boolean; message: string }>;

    /**
     * Check current permission status
     */
    checkPermissions(): Promise<BackgroundLocationPermissions>;

    /**
     * Request all required permissions for background tracking
     * Requests in order: location → background → activity recognition → notification
     */
    requestPermissions(): Promise<BackgroundLocationPermissions>;

    /**
     * Request only background location permission
     * Should be called after regular location permission is granted
     */
    requestBackgroundPermission(): Promise<{ backgroundLocation: 'granted' | 'denied' }>;

    /**
     * Request activity recognition permission
     * Used for smart tracking (detecting walking, driving, etc.)
     */
    requestActivityRecognitionPermission(): Promise<{ activityRecognition: 'granted' | 'denied' }>;

    /**
     * Open battery optimization settings
     * User needs to exempt app for reliable background tracking
     */
    openBatteryOptimizationSettings(): Promise<{ success: boolean }>;

    /**
     * Open app settings page
     * Useful for directing user to manually enable permissions
     */
    openAppSettings(): Promise<{ success: boolean }>;

    /**
     * Check if tracking is currently active
     * This persists even after app restart
     */
    isTrackingActive(): Promise<{ isActive: boolean }>;
}

const BackgroundLocation = registerPlugin<BackgroundLocationPlugin>('BackgroundLocation');

export default BackgroundLocation;

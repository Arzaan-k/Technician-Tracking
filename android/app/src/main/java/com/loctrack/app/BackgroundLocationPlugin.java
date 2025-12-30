package com.loctrack.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor Plugin for Production-Grade Background Location Tracking
 * 
 * This plugin bridges JavaScript to the native LocationBackgroundService
 * which provides iSharing/Life360-style background tracking.
 */
@CapacitorPlugin(
    name = "BackgroundLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "backgroundLocation",
            strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }
        ),
        @Permission(
            alias = "activityRecognition",
            strings = { Manifest.permission.ACTIVITY_RECOGNITION }
        ),
        @Permission(
            alias = "notification",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class BackgroundLocationPlugin extends Plugin {
    private static final String TAG = "BackgroundLocationPlugin";
    
    @PluginMethod
    public void startTracking(PluginCall call) {
        Log.d(TAG, "startTracking called");
        
        // Validate permissions
        if (!hasLocationPermission()) {
            call.reject("Location permission not granted. Please grant location permission first.");
            return;
        }
        
        // Get auth credentials
        String authToken = call.getString("authToken");
        String apiUrl = call.getString("apiUrl", "https://loctrack-api.onrender.com/api");
        
        if (authToken == null || authToken.isEmpty()) {
            call.reject("Auth token is required");
            return;
        }
        
        // Save credentials and tracking state
        LocationBackgroundService.saveCredentials(getContext(), authToken, apiUrl);
        LocationBackgroundService.setTrackingEnabled(getContext(), true);
        
        // Request battery optimization exemption (opens system dialog)
        requestBatteryOptimizationExemption();
        
        // Start the production-grade background service
        Intent serviceIntent = new Intent(getContext(), LocationBackgroundService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            Log.d(TAG, "✅ Production background location service started");
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Background location tracking started (production mode)");
            ret.put("features", getEnabledFeatures());
            call.resolve(ret);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service: " + e.getMessage(), e);
            call.reject("Failed to start tracking: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void stopTracking(PluginCall call) {
        Log.d(TAG, "stopTracking called");
        
        // Update tracking state
        LocationBackgroundService.setTrackingEnabled(getContext(), false);
        
        // Stop the service
        Intent serviceIntent = new Intent(getContext(), LocationBackgroundService.class);
        getContext().stopService(serviceIntent);
        
        Log.d(TAG, "✅ Background location service stopped");
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Background location tracking stopped");
        call.resolve(ret);
    }
    
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("location", hasLocationPermission() ? "granted" : "denied");
        ret.put("backgroundLocation", hasBackgroundLocationPermission() ? "granted" : "denied");
        ret.put("activityRecognition", hasActivityRecognitionPermission() ? "granted" : "denied");
        ret.put("notification", hasNotificationPermission() ? "granted" : "denied");
        ret.put("batteryOptimizationExempt", isBatteryOptimizationExempt());
        ret.put("isTracking", LocationBackgroundService.isTrackingEnabled(getContext()));
        call.resolve(ret);
    }
    
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        // Request location permissions first
        if (!hasLocationPermission()) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        
        // Then request background location
        if (!hasBackgroundLocationPermission()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                requestPermissionForAlias("backgroundLocation", call, "backgroundLocationPermissionCallback");
                return;
            }
        }
        
        // Then request activity recognition (for smart tracking)
        if (!hasActivityRecognitionPermission()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                requestPermissionForAlias("activityRecognition", call, "activityRecognitionPermissionCallback");
                return;
            }
        }
        
        // Request notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotificationPermission()) {
            requestPermissionForAlias("notification", call, "notificationPermissionCallback");
            return;
        }
        
        // All permissions granted
        resolveAllPermissions(call);
    }
    
    @PluginMethod
    public void requestBackgroundPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (!hasBackgroundLocationPermission()) {
                requestPermissionForAlias("backgroundLocation", call, "backgroundLocationPermissionCallback");
                return;
            }
        }
        
        JSObject ret = new JSObject();
        ret.put("backgroundLocation", hasBackgroundLocationPermission() ? "granted" : "denied");
        call.resolve(ret);
    }
    
    @PluginMethod
    public void requestActivityRecognitionPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (!hasActivityRecognitionPermission()) {
                requestPermissionForAlias("activityRecognition", call, "activityRecognitionPermissionCallback");
                return;
            }
        }
        
        JSObject ret = new JSObject();
        ret.put("activityRecognition", hasActivityRecognitionPermission() ? "granted" : "denied");
        call.resolve(ret);
    }
    
    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open battery settings: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open app settings: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void isTrackingActive(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isActive", LocationBackgroundService.isTrackingEnabled(getContext()));
        call.resolve(ret);
    }
    
    // ==================== Permission Callbacks ====================
    
    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (hasLocationPermission()) {
            // Now request background location
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasBackgroundLocationPermission()) {
                requestPermissionForAlias("backgroundLocation", call, "backgroundLocationPermissionCallback");
                return;
            }
            resolveAllPermissions(call);
        } else {
            call.reject("Location permission denied");
        }
    }
    
    @PermissionCallback
    private void backgroundLocationPermissionCallback(PluginCall call) {
        // Now request activity recognition
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasActivityRecognitionPermission()) {
            requestPermissionForAlias("activityRecognition", call, "activityRecognitionPermissionCallback");
            return;
        }
        resolveAllPermissions(call);
    }
    
    @PermissionCallback
    private void activityRecognitionPermissionCallback(PluginCall call) {
        // Now request notification
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotificationPermission()) {
            requestPermissionForAlias("notification", call, "notificationPermissionCallback");
            return;
        }
        resolveAllPermissions(call);
    }
    
    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        resolveAllPermissions(call);
    }
    
    private void resolveAllPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("location", hasLocationPermission() ? "granted" : "denied");
        ret.put("backgroundLocation", hasBackgroundLocationPermission() ? "granted" : "denied");
        ret.put("activityRecognition", hasActivityRecognitionPermission() ? "granted" : "denied");
        ret.put("notification", hasNotificationPermission() ? "granted" : "denied");
        call.resolve(ret);
    }
    
    // ==================== Permission Checks ====================
    
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                == PackageManager.PERMISSION_GRANTED;
    }
    
    private boolean hasBackgroundLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION) 
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }
    
    private boolean hasActivityRecognitionPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION) 
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }
    
    private boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) 
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }
    
    private boolean isBatteryOptimizationExempt() {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            return pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        return false;
    }
    
    private void requestBatteryOptimizationExemption() {
        if (!isBatteryOptimizationExempt()) {
            try {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Failed to request battery optimization exemption", e);
            }
        }
    }
    
    private JSObject getEnabledFeatures() {
        JSObject features = new JSObject();
        features.put("backgroundLocation", hasBackgroundLocationPermission());
        features.put("activityRecognition", hasActivityRecognitionPermission());
        features.put("batteryOptimizationExempt", isBatteryOptimizationExempt());
        features.put("bootRestart", true); // Always enabled via manifest
        return features;
    }
}

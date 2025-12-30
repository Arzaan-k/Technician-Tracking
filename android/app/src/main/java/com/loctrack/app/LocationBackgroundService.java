package com.loctrack.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.ActivityRecognition;
import com.google.android.gms.location.ActivityRecognitionClient;
import com.google.android.gms.location.ActivityTransition;
import com.google.android.gms.location.ActivityTransitionEvent;
import com.google.android.gms.location.ActivityTransitionRequest;
import com.google.android.gms.location.ActivityTransitionResult;
import com.google.android.gms.location.DetectedActivity;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Production-grade Background Location Service
 * Similar to iSharing/Life360 implementation
 * 
 * Features:
 * - FusedLocationProviderClient for best accuracy
 * - Activity Recognition for smart tracking (walking, driving, stationary)
 * - Dynamic location intervals based on activity
 * - Battery-aware tracking
 * - Survives app kill and device reboot
 * - Efficient batching and syncing
 */
public class LocationBackgroundService extends Service {
    private static final String TAG = "LocationBgService";
    private static final String CHANNEL_ID = "loctrack_location_channel";
    private static final int NOTIFICATION_ID = 12345;
    
    // Activity-based location intervals (milliseconds) - HIGH ACCURACY MODE
    private static final long INTERVAL_STATIONARY = 30000;   // 30 sec when not moving
    private static final long INTERVAL_WALKING = 4000;       // 4 sec when walking
    private static final long INTERVAL_RUNNING = 2000;       // 2 sec when running
    private static final long INTERVAL_DRIVING = 2000;       // 2 sec when in vehicle
    private static final long INTERVAL_DEFAULT = 4000;       // 4 sec default
    
    // Fastest intervals (minimum time between updates)
    private static final long FASTEST_INTERVAL = 1000;       // 1 second minimum
    
    // Movement thresholds - MORE SENSITIVE
    private static final float DISPLACEMENT_STATIONARY = 15f; // 15m when stationary
    private static final float DISPLACEMENT_MOVING = 0f;      // 0m when moving (capture all updates)
    
    // Sync settings
    private static final long SYNC_INTERVAL_MS = 15000;      // Sync every 15 seconds
    private static final int MAX_BATCH_SIZE = 100;           // Max locations before force sync
    
    // Smart tracking - pause if stationary for too long
    private static final long STATIONARY_PAUSE_THRESHOLD = 300000; // 5 minutes
    
    private FusedLocationProviderClient fusedLocationClient;
    private ActivityRecognitionClient activityRecognitionClient;
    private LocationCallback locationCallback;
    private PendingIntent activityTransitionPendingIntent;
    private PowerManager.WakeLock wakeLock;
    private Handler syncHandler;
    private Runnable syncRunnable;
    
    private List<JSONObject> locationBatch = new ArrayList<>();
    private ExecutorService executorService;
    
    private String authToken;
    private String apiUrl;
    
    // Current state tracking
    private int currentActivity = DetectedActivity.UNKNOWN;
    private long lastMovementTime = 0;
    private Location lastLocation = null;
    private boolean isLowPowerMode = false;
    private long currentInterval = INTERVAL_DEFAULT;
    
    // Activity transition receiver
    private BroadcastReceiver activityTransitionReceiver;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate - Production-grade tracking starting");
        
        executorService = Executors.newFixedThreadPool(2);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        activityRecognitionClient = ActivityRecognition.getClient(this);
        syncHandler = new Handler(Looper.getMainLooper());
        lastMovementTime = System.currentTimeMillis();
        
        loadCredentials();
        createNotificationChannel();
        acquireWakeLock();
        setupLocationCallback();
        setupActivityRecognition();
        setupPeriodicSync();
        registerBatteryReceiver();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service onStartCommand - flags: " + flags);
        
        // Reload credentials in case they were updated
        loadCredentials();
        
        // Start as foreground service immediately
        startForeground(NOTIFICATION_ID, createNotification("Initializing..."));
        
        // Start location updates with current activity-based interval
        startLocationUpdates();
        
        // Start activity recognition
        startActivityRecognition();
        
        // Return START_STICKY so service restarts if killed by system
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "Service onDestroy - performing cleanup and final sync");
        
        // Final sync before dying
        syncLocationsNow();
        
        stopLocationUpdates();
        stopActivityRecognition();
        unregisterBatteryReceiver();
        
        if (syncHandler != null && syncRunnable != null) {
            syncHandler.removeCallbacks(syncRunnable);
        }
        
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        if (executorService != null) {
            executorService.shutdown();
        }
        
        super.onDestroy();
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    // ==================== CREDENTIALS MANAGEMENT ====================
    
    private void loadCredentials() {
        SharedPreferences prefs = getSharedPreferences("LocTrackPrefs", MODE_PRIVATE);
        authToken = prefs.getString("authToken", null);
        apiUrl = prefs.getString("apiUrl", "https://loctrack-api.onrender.com/api");
        Log.d(TAG, "Credentials loaded, token exists: " + (authToken != null));
    }
    
    public static void saveCredentials(Context context, String token, String apiUrl) {
        SharedPreferences prefs = context.getSharedPreferences("LocTrackPrefs", MODE_PRIVATE);
        prefs.edit()
            .putString("authToken", token)
            .putString("apiUrl", apiUrl)
            .apply();
        Log.d(TAG, "Credentials saved");
    }
    
    public static void setTrackingEnabled(Context context, boolean enabled) {
        SharedPreferences prefs = context.getSharedPreferences("LocTrackPrefs", MODE_PRIVATE);
        prefs.edit().putBoolean("trackingEnabled", enabled).apply();
    }
    
    public static boolean isTrackingEnabled(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("LocTrackPrefs", MODE_PRIVATE);
        return prefs.getBoolean("trackingEnabled", false);
    }
    
    // ==================== NOTIFICATION ====================
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Real-time location tracking for LocTrack");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification(String status) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        String activityName = getActivityName(currentActivity);
        String contentText = status != null ? status : 
            "Tracking active • " + activityName + " • " + (currentInterval / 1000) + "s interval";
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("📍 LocTrack Active")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_stat_location)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setShowWhen(false)
            .build();
    }
    
    private void updateNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, createNotification(null));
        }
    }
    
    private String getActivityName(int activity) {
        switch (activity) {
            case DetectedActivity.IN_VEHICLE: return "🚗 Driving";
            case DetectedActivity.ON_BICYCLE: return "🚴 Cycling";
            case DetectedActivity.RUNNING: return "🏃 Running";
            case DetectedActivity.WALKING: return "🚶 Walking";
            case DetectedActivity.STILL: return "🧍 Stationary";
            default: return "📍 Active";
        }
    }
    
    // ==================== WAKE LOCK ====================
    
    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "LocTrack::LocationWakeLock"
            );
            // Acquire for 24 hours max, will be released on service destroy
            wakeLock.acquire(24 * 60 * 60 * 1000L);
            Log.d(TAG, "WakeLock acquired");
        }
    }
    
    // ==================== LOCATION TRACKING ====================
    
    private void setupLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult locationResult) {
                for (Location location : locationResult.getLocations()) {
                    processLocation(location);
                }
            }
        };
    }
    
    private void processLocation(Location location) {
        // High Accuracy Filter: discard poor/noisy signals > 25m
        if (location.hasAccuracy() && location.getAccuracy() > 25) {
            Log.v(TAG, "Skipping inaccurate location: " + location.getAccuracy() + "m");
            return;
        }

        // Check if this is a significant movement
        boolean isSignificantMovement = true;
        
        if (lastLocation != null) {
            float distance = lastLocation.distanceTo(location);
            float minDistance = (currentActivity == DetectedActivity.STILL) ? 
                DISPLACEMENT_STATIONARY : DISPLACEMENT_MOVING;
            
            isSignificantMovement = distance >= minDistance;
            
            if (isSignificantMovement) {
                lastMovementTime = System.currentTimeMillis();
            }
        }
        
        // Always update last location
        lastLocation = location;
        
        // Only log if significant or first location
        if (isSignificantMovement || locationBatch.isEmpty()) {
            Log.d(TAG, String.format("📍 Location: %.6f, %.6f (accuracy: %.1fm, speed: %.1f m/s)", 
                location.getLatitude(), 
                location.getLongitude(),
                location.getAccuracy(),
                location.hasSpeed() ? location.getSpeed() : 0));
            
            addLocationToBatch(location);
        }
        
        // Check if we should pause tracking (stationary for too long)
        checkStationaryPause();
    }
    
    private void startLocationUpdates() {
        try {
            LocationRequest locationRequest = createLocationRequest();
            
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            );
            
            Log.d(TAG, "Location updates started (interval: " + currentInterval + "ms)");
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission denied", e);
        }
    }
    
    private void stopLocationUpdates() {
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
            Log.d(TAG, "Location updates stopped");
        }
    }
    
    private LocationRequest createLocationRequest() {
        int priority = isLowPowerMode ? 
            Priority.PRIORITY_BALANCED_POWER_ACCURACY : 
            Priority.PRIORITY_HIGH_ACCURACY;
        
        float displacement = (currentActivity == DetectedActivity.STILL) ? 
            DISPLACEMENT_STATIONARY : DISPLACEMENT_MOVING;
        
        return new LocationRequest.Builder(priority, currentInterval)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL)
            .setMinUpdateDistanceMeters(displacement)
            .setWaitForAccurateLocation(false)
            .build();
    }
    
    private void updateLocationInterval() {
        // Determine new interval based on activity
        long newInterval;
        switch (currentActivity) {
            case DetectedActivity.IN_VEHICLE:
            case DetectedActivity.ON_BICYCLE:
                newInterval = INTERVAL_DRIVING;
                break;
            case DetectedActivity.RUNNING:
                newInterval = INTERVAL_RUNNING;
                break;
            case DetectedActivity.WALKING:
                newInterval = INTERVAL_WALKING;
                break;
            case DetectedActivity.STILL:
                newInterval = INTERVAL_STATIONARY;
                break;
            default:
                newInterval = INTERVAL_DEFAULT;
        }
        
        // Apply low power mode adjustment
        if (isLowPowerMode) {
            newInterval = Math.max(newInterval * 2, 30000);
        }
        
        // Only restart if interval changed significantly
        if (Math.abs(newInterval - currentInterval) > 2000) {
            currentInterval = newInterval;
            Log.d(TAG, "Updating location interval to: " + currentInterval + "ms");
            
            // Restart location updates with new interval
            stopLocationUpdates();
            startLocationUpdates();
            updateNotification();
        }
    }
    
    private void checkStationaryPause() {
        long timeSinceMovement = System.currentTimeMillis() - lastMovementTime;
        
        if (timeSinceMovement > STATIONARY_PAUSE_THRESHOLD && 
            currentActivity == DetectedActivity.STILL &&
            currentInterval < INTERVAL_STATIONARY) {
            
            Log.d(TAG, "User stationary for " + (timeSinceMovement / 1000) + "s, reducing update frequency");
            currentInterval = INTERVAL_STATIONARY;
            stopLocationUpdates();
            startLocationUpdates();
            updateNotification();
        }
    }
    
    // ==================== ACTIVITY RECOGNITION ====================
    
    private void setupActivityRecognition() {
        Intent intent = new Intent(this, ActivityTransitionReceiver.class);
        activityTransitionPendingIntent = PendingIntent.getBroadcast(
            this, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        
        // Register receiver for activity transitions
        activityTransitionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (ActivityTransitionResult.hasResult(intent)) {
                    ActivityTransitionResult result = ActivityTransitionResult.extractResult(intent);
                    if (result != null) {
                        for (ActivityTransitionEvent event : result.getTransitionEvents()) {
                            if (event.getTransitionType() == ActivityTransition.ACTIVITY_TRANSITION_ENTER) {
                                onActivityChanged(event.getActivityType());
                            }
                        }
                    }
                }
            }
        };
        
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.loctrack.ACTIVITY_TRANSITION");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(activityTransitionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(activityTransitionReceiver, filter);
        }
    }
    
    private void startActivityRecognition() {
        try {
            List<ActivityTransition> transitions = Arrays.asList(
                new ActivityTransition.Builder()
                    .setActivityType(DetectedActivity.STILL)
                    .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                    .build(),
                new ActivityTransition.Builder()
                    .setActivityType(DetectedActivity.WALKING)
                    .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                    .build(),
                new ActivityTransition.Builder()
                    .setActivityType(DetectedActivity.RUNNING)
                    .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                    .build(),
                new ActivityTransition.Builder()
                    .setActivityType(DetectedActivity.IN_VEHICLE)
                    .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                    .build(),
                new ActivityTransition.Builder()
                    .setActivityType(DetectedActivity.ON_BICYCLE)
                    .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                    .build()
            );
            
            ActivityTransitionRequest request = new ActivityTransitionRequest(transitions);
            activityRecognitionClient.requestActivityTransitionUpdates(request, activityTransitionPendingIntent)
                .addOnSuccessListener(aVoid -> Log.d(TAG, "Activity recognition started"))
                .addOnFailureListener(e -> Log.e(TAG, "Activity recognition failed: " + e.getMessage()));
                
        } catch (SecurityException e) {
            Log.e(TAG, "Activity recognition permission denied", e);
        }
    }
    
    private void stopActivityRecognition() {
        if (activityRecognitionClient != null && activityTransitionPendingIntent != null) {
            activityRecognitionClient.removeActivityTransitionUpdates(activityTransitionPendingIntent);
        }
        if (activityTransitionReceiver != null) {
            try {
                unregisterReceiver(activityTransitionReceiver);
            } catch (Exception e) {
                // Already unregistered
            }
        }
    }
    
    private void onActivityChanged(int newActivity) {
        if (newActivity != currentActivity) {
            Log.d(TAG, "Activity changed: " + getActivityName(currentActivity) + " → " + getActivityName(newActivity));
            currentActivity = newActivity;
            
            // Update location tracking interval based on new activity
            updateLocationInterval();
            
            // If user started moving, reset the stationary timer
            if (newActivity != DetectedActivity.STILL) {
                lastMovementTime = System.currentTimeMillis();
            }
        }
    }
    
    // ==================== BATTERY AWARENESS ====================
    
    private BroadcastReceiver batteryReceiver;
    
    private void registerBatteryReceiver() {
        batteryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                float batteryPct = level * 100 / (float) scale;
                
                boolean wasLowPower = isLowPowerMode;
                isLowPowerMode = batteryPct < 20;
                
                if (isLowPowerMode != wasLowPower) {
                    Log.d(TAG, "Battery mode changed: " + (isLowPowerMode ? "LOW POWER" : "NORMAL"));
                    updateLocationInterval();
                }
            }
        };
        
        IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        registerReceiver(batteryReceiver, filter);
    }
    
    private void unregisterBatteryReceiver() {
        if (batteryReceiver != null) {
            try {
                unregisterReceiver(batteryReceiver);
            } catch (Exception e) {
                // Already unregistered
            }
        }
    }
    
    private int getBatteryLevel() {
        Intent batteryIntent = registerReceiver(null, 
            new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (batteryIntent != null) {
            int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            if (level >= 0 && scale > 0) {
                return (int) ((level / (float) scale) * 100);
            }
        }
        return -1;
    }
    
    // ==================== LOCATION BATCHING & SYNC ====================
    
    private void addLocationToBatch(Location location) {
        try {
            JSONObject locationJson = new JSONObject();
            locationJson.put("latitude", location.getLatitude());
            locationJson.put("longitude", location.getLongitude());
            locationJson.put("accuracy", location.getAccuracy());
            locationJson.put("speed", location.hasSpeed() ? location.getSpeed() : JSONObject.NULL);
            locationJson.put("heading", location.hasBearing() ? location.getBearing() : JSONObject.NULL);
            locationJson.put("timestamp", System.currentTimeMillis());
            locationJson.put("batteryLevel", getBatteryLevel());
            locationJson.put("networkStatus", "online");
            locationJson.put("activity", getActivityName(currentActivity));
            
            synchronized (locationBatch) {
                locationBatch.add(locationJson);
                
                // Force sync if batch is getting too large
                if (locationBatch.size() >= MAX_BATCH_SIZE) {
                    Log.d(TAG, "Batch full (" + MAX_BATCH_SIZE + "), forcing sync");
                    syncLocationsAsync();
                }
            }
        } catch (JSONException e) {
            Log.e(TAG, "Error creating location JSON", e);
        }
    }
    
    private void setupPeriodicSync() {
        syncRunnable = new Runnable() {
            @Override
            public void run() {
                syncLocationsAsync();
                // Adjust sync interval based on activity
                long nextSync = (currentActivity == DetectedActivity.STILL) ? 
                    SYNC_INTERVAL_MS * 2 : SYNC_INTERVAL_MS;
                syncHandler.postDelayed(this, nextSync);
            }
        };
        syncHandler.postDelayed(syncRunnable, SYNC_INTERVAL_MS);
        Log.d(TAG, "Periodic sync scheduled (interval: " + SYNC_INTERVAL_MS + "ms)");
    }
    
    private void syncLocationsAsync() {
        executorService.execute(this::syncLocationsNow);
    }
    
    private void syncLocationsNow() {
        List<JSONObject> locationsToSync;
        
        synchronized (locationBatch) {
            if (locationBatch.isEmpty()) {
                return;
            }
            locationsToSync = new ArrayList<>(locationBatch);
            locationBatch.clear();
        }
        
        if (authToken == null || authToken.isEmpty()) {
            Log.w(TAG, "No auth token, cannot sync - storing for later");
            synchronized (locationBatch) {
                locationBatch.addAll(0, locationsToSync);
            }
            return;
        }
        
        try {
            JSONObject requestBody = new JSONObject();
            JSONArray locationsArray = new JSONArray();
            for (JSONObject loc : locationsToSync) {
                locationsArray.put(loc);
            }
            requestBody.put("locations", locationsArray);
            
            URL url = new URL(apiUrl + "/location/update");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + authToken);
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = requestBody.toString().getBytes("utf-8");
                os.write(input, 0, input.length);
            }
            
            int responseCode = conn.getResponseCode();
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                Log.d(TAG, "✅ Synced " + locationsToSync.size() + " locations");
            } else {
                Log.e(TAG, "❌ Sync failed with code: " + responseCode);
                synchronized (locationBatch) {
                    locationBatch.addAll(0, locationsToSync);
                }
            }
            
            conn.disconnect();
            
        } catch (IOException | JSONException e) {
            Log.e(TAG, "❌ Sync error: " + e.getMessage());
            synchronized (locationBatch) {
                locationBatch.addAll(0, locationsToSync);
            }
        }
    }
    
    // ==================== SERVICE LIFECYCLE ====================
    
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d(TAG, "Task removed - ensuring service continues");
        
        // Save state
        setTrackingEnabled(this, true);
        
        // Schedule restart
        Intent restartIntent = new Intent(getApplicationContext(), LocationBackgroundService.class);
        restartIntent.setPackage(getPackageName());
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(restartIntent);
        } else {
            startService(restartIntent);
        }
        
        super.onTaskRemoved(rootIntent);
    }
    
    @Override
    public void onLowMemory() {
        super.onLowMemory();
        Log.w(TAG, "Low memory warning - forcing sync");
        syncLocationsNow();
    }
    
    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= TRIM_MEMORY_MODERATE) {
            Log.w(TAG, "Memory trim level " + level + " - syncing and reducing buffers");
            syncLocationsNow();
        }
    }
}

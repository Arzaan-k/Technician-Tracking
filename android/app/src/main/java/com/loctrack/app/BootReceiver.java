package com.loctrack.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Boot Receiver - Restarts location tracking after device reboot
 * 
 * This is critical for iSharing-style tracking:
 * - User turns on tracking
 * - Phone reboots (OS update, battery died, etc.)
 * - This receiver starts the service again automatically
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        
        String action = intent.getAction();
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            Log.d(TAG, "Device boot detected, checking if tracking should restart");
            
            // Check if tracking was enabled before reboot
            if (LocationBackgroundService.isTrackingEnabled(context)) {
                Log.d(TAG, "Tracking was enabled, restarting service...");
                
                Intent serviceIntent = new Intent(context, LocationBackgroundService.class);
                
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                    Log.d(TAG, "Location service restarted after boot");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to restart service after boot: " + e.getMessage());
                }
            } else {
                Log.d(TAG, "Tracking was not enabled, not starting service");
            }
        }
    }
}

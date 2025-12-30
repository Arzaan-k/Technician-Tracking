package com.loctrack.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.google.android.gms.location.ActivityTransitionResult;

/**
 * Receives activity transition updates from Google Play Services
 * Used to detect when user starts walking, driving, etc.
 */
public class ActivityTransitionReceiver extends BroadcastReceiver {
    private static final String TAG = "ActivityTransition";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Activity transition received");
        
        if (ActivityTransitionResult.hasResult(intent)) {
            // Forward to the main service via broadcast
            Intent broadcastIntent = new Intent("com.loctrack.ACTIVITY_TRANSITION");
            broadcastIntent.putExtras(intent);
            context.sendBroadcast(broadcastIntent);
        }
    }
}

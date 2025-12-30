# Production-Grade Background Location Tracking

## 🎯 Overview

LocTrack now uses **iSharing/Life360-style** background location tracking with:

- **Activity Recognition** - Detects walking, running, driving, stationary
- **Smart Intervals** - Adjusts GPS polling based on activity (3s driving, 60s stationary)
- **Boot Persistence** - Restarts tracking after device reboot
- **Battery Awareness** - Reduces accuracy when battery is low
- **Survives App Kill** - Continues tracking even when app is swiped away

---

## 📱 How It Works

### Tracking Flow

```
📱 User starts tracking
    │
    ├─→ Request Permissions (Location, Background, Activity Recognition)
    ├─→ Request Battery Optimization Exemption
    ├─→ Start Foreground Service (persistent notification)
    │
    ├─→ 🏃 Activity Recognition starts monitoring
    │       └─→ Detects: Walking, Running, Driving, Stationary
    │
    ├─→ 📍 FusedLocationProviderClient begins tracking
    │       └─→ Interval based on activity:
    │           • Driving: 3 seconds
    │           • Running: 5 seconds  
    │           • Walking: 10 seconds
    │           • Stationary: 60 seconds
    │
    └─→ 🔄 Periodic sync to server (every 15 seconds)
```

### When App is Killed

```
User swipes app away
    │
    ├─→ onTaskRemoved() is called
    ├─→ Service schedules restart
    ├─→ START_STICKY ensures system restarts if killed
    │
    └─→ Tracking continues in background ✅
```

### After Device Reboot

```
Device boots
    │
    ├─→ BootReceiver receives BOOT_COMPLETED
    ├─→ Checks if tracking was enabled
    │
    └─→ If enabled: Restarts LocationBackgroundService ✅
```

---

## 📁 Files Structure

### Native Android (Java)

| File | Purpose |
|------|---------|
| `LocationBackgroundService.java` | Main service with FusedLocation + Activity Recognition |
| `BackgroundLocationPlugin.java` | Capacitor plugin bridge |
| `BootReceiver.java` | Restarts tracking after reboot |
| `ActivityTransitionReceiver.java` | Handles activity transitions |
| `MainActivity.java` | Registers the plugin |

### Frontend (TypeScript)

| File | Purpose |
|------|---------|
| `src/lib/BackgroundLocation.ts` | Plugin TypeScript definitions |
| `src/hooks/useGeolocation.ts` | React hook for location tracking |

### Configuration

| File | Purpose |
|------|---------|
| `AndroidManifest.xml` | Permissions, services, receivers |
| `android/app/build.gradle` | Google Play Services dependency |

---

## 🔐 Permissions Required

| Permission | Purpose |
|------------|---------|
| `ACCESS_FINE_LOCATION` | High accuracy GPS |
| `ACCESS_COARSE_LOCATION` | Network-based location |
| `ACCESS_BACKGROUND_LOCATION` | Track when app in background |
| `ACTIVITY_RECOGNITION` | Detect walking, driving, etc. |
| `FOREGROUND_SERVICE` | Run as foreground service |
| `FOREGROUND_SERVICE_LOCATION` | Android 14+ requirement |
| `POST_NOTIFICATIONS` | Show persistent notification |
| `WAKE_LOCK` | Prevent CPU sleep |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Survive Doze mode |
| `RECEIVE_BOOT_COMPLETED` | Restart after reboot |

---

## ⚙️ Configuration

### Location Intervals (in `LocationBackgroundService.java`)

```java
// Activity-based intervals
private static final long INTERVAL_STATIONARY = 60000;   // 60 sec
private static final long INTERVAL_WALKING = 10000;      // 10 sec
private static final long INTERVAL_RUNNING = 5000;       // 5 sec
private static final long INTERVAL_DRIVING = 3000;       // 3 sec

// Minimum displacement to log
private static final float DISPLACEMENT_STATIONARY = 50f; // 50 meters
private static final float DISPLACEMENT_MOVING = 5f;      // 5 meters

// Sync interval
private static final long SYNC_INTERVAL_MS = 15000;       // 15 sec
```

### Battery Optimization

When battery < 20%, the app automatically:
- Doubles the location interval
- Uses balanced power accuracy instead of high accuracy

---

## 🛠️ Building the App

1. **Build frontend:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

4. **Build APK:**
   - In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## ✅ Testing Background Tracking

### Test 1: App in Background
1. Start tracking
2. Press Home button
3. Wait 5 minutes
4. Check `location_logs` table → Should have new entries

### Test 2: App Killed
1. Start tracking
2. Open Recent Apps
3. Swipe away LocTrack
4. Wait 5 minutes
5. Check `location_logs` table → Should continue updating
6. Notification should remain visible

### Test 3: Device Reboot
1. Start tracking
2. Restart the device
3. After boot, check notification → Should show "LocTrack Active"
4. Check `location_logs` table → Should continue updating

### Test 4: Activity Detection
1. Start tracking while stationary
2. Notification shows: "🧍 Stationary • 60s interval"
3. Start walking
4. Notification updates: "🚶 Walking • 10s interval"
5. Get in a car and drive
6. Notification updates: "🚗 Driving • 3s interval"

---

## 🔧 Troubleshooting

### Tracking stops when app is killed

1. **Check battery optimization**:
   - Settings → Apps → LocTrack → Battery → Unrestricted

2. **For Xiaomi/MIUI**:
   - Settings → Apps → Manage apps → LocTrack → Autostart: ON
   - Security → Manage apps → LocTrack → Allow battery saver

3. **For Huawei/EMUI**:
   - Settings → Apps → LocTrack → Battery → Launch: Manual, all toggles ON
   - Phone Manager → App launch → LocTrack → Manage manually

4. **For OPPO/Realme**:
   - Settings → Battery → Energy saver → LocTrack → Allow background activity

### Tracking doesn't resume after reboot

- Ensure `RECEIVE_BOOT_COMPLETED` permission is granted
- Some devices require adding app to "Auto-start" list

### Activity recognition not working

- Ensure `ACTIVITY_RECOGNITION` permission is granted (Android 10+)
- Google Play Services must be up to date

---

## 📊 Database Schema

Location updates are stored in:

```sql
CREATE TABLE location_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy FLOAT,
    speed FLOAT,
    heading FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE,
    battery_level INTEGER,
    network_status VARCHAR(20)
);
```

---

## 🔒 Privacy & Security

- All location data is synced over HTTPS
- Auth token is stored securely in SharedPreferences
- Location data only sent when authenticated
- User can stop tracking at any time
- Notification always visible when tracking (Android requirement)

---

## 📈 Comparison with iSharing/Life360

| Feature | LocTrack | iSharing | Life360 |
|---------|----------|----------|---------|
| Foreground Service | ✅ | ✅ | ✅ |
| Activity Recognition | ✅ | ✅ | ✅ |
| Smart Intervals | ✅ | ✅ | ✅ |
| Boot Restart | ✅ | ✅ | ✅ |
| Battery Awareness | ✅ | ✅ | ✅ |
| Geofencing | ❌ | ✅ | ✅ |
| Crash Location | ❌ | ❌ | ✅ |

Future improvements could add geofencing for even smarter tracking.

# 📱 Build APK Guide - LocTrack

## Quick Build (Debug APK) - For Testing

Android Studio should now be open. Follow these steps:

### Option 1: Using Android Studio GUI (Easiest)

1. **Wait for Gradle Sync** to complete (bottom right corner)
   - You'll see "Gradle Sync" running
   - Wait until you see "Sync successful"

2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Click the "Build" menu at the top
   - Select "Build Bundle(s) / APK(s)"
   - Click "Build APK(s)"

3. **Wait for Build** (takes 2-5 minutes)
   - You'll see progress at the bottom
   - When done, you'll see: "APK(s) generated successfully"

4. **Click "locate"** in the notification
   - Or find it at: `android/app/build/outputs/apk/debug/app-debug.apk`

5. **Install on Phone**
   - Transfer the APK to your phone
   - Install it (allow "Install from unknown sources" if needed)
   - This APK will connect to: `https://loctrack-api.onrender.com`

---

## Production Build (Signed Release APK) - For Distribution

### Prerequisites: Generate Signing Key (One-time setup)

Open PowerShell and run:

```powershell
cd "C:\Users\msi user\Desktop\Developer\Location Tracking App\android"

# Generate keystore (keep this file safe!)
keytool -genkey -v -keystore loctrack-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias loctrack
```

You'll be asked:
- **Keystore password**: Create a strong password (REMEMBER THIS!)
- **Re-enter password**: Same as above
- **First and last name**: Crystal Group
- **Organizational unit**: IT
- **Organization**: Crystal Group
- **City**: Your city
- **State**: Your state  
- **Country code**: IN
- **Is this correct?**: yes
- **Key password**: Press Enter (use same as keystore password)

### Configure Signing

Create file: `android/app/keystore.properties`

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEYSTORE_PASSWORD
keyAlias=loctrack
storeFile=loctrack-release-key.jks
```

Update `android/app/build.gradle`:

Add this BEFORE the `android {` block:

```gradle
def keystorePropertiesFile = rootProject.file("app/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Add this INSIDE the `android {` block, after `defaultConfig`:

```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
}
```

Update `buildTypes` block:

```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### Build Signed Release APK

In Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Select **APK** → Next
3. Fill in:
   - **Key store path**: Browse to `loctrack-release-key.jks`
   - **Key store password**: Your password
   - **Key alias**: loctrack
   - **Key password**: Your password
4. Click **Next**
5. Select **release** build variant
6. Click **Finish**

Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Current APK Configuration

✅ **Production Backend**: `https://loctrack-api.onrender.com/api`  
✅ **App ID**: `com.loctrack.app`  
✅ **App Name**: LocTrack  
✅ **Version**: 1.0 (versionCode: 1)

---

## Testing Checklist

Before distributing to users:

- [ ] Install on test device
- [ ] Test login with actual credentials
- [ ] Start location tracking
- [ ] Minimize app - verify tracking continues
- [ ] Wait 5 minutes - check location updates are sent
- [ ] View history - verify sessions are recorded
- [ ] Test logout and re-login
- [ ] Check battery usage

---

## Distribution Options

### Option 1: Direct APK Distribution (Fastest)

1. Build the APK (debug or signed release)
2. Upload to Google Drive / Dropbox
3. Share link with technicians
4. Technicians download and install

**Pros**: Instant, no approval process  
**Cons**: Users need to enable "Install from unknown sources"

### Option 2: Google Play Store (Internal Testing)

1. Create Google Play Developer Account ($25 one-time)
2. Build signed AAB (App Bundle):
   - **Build → Generate Signed Bundle / APK**
   - Select **Android App Bundle**
   - Use same signing config
3. Upload to Play Console → Internal Testing
4. Add testers by email
5. They install from Play Store

**Pros**: Professional, easy updates, no "unknown sources"  
**Cons**: $25 fee, takes 1-2 days for first approval

### Option 3: Google Play Store (Public)

Same as Option 2, but submit for Production instead of Internal Testing
- Full review process (1-3 days)
- Available to anyone searching Play Store

---

## Updating the App

When you make changes:

1. **Increment version**:
   - Edit `android/app/build.gradle`
   - `versionCode 2` (increment by 1)
   - `versionName "1.1"` (semantic versioning)

2. **Rebuild**:
   ```bash
   npm run build
   npx cap sync android
   ```

3. **Build new APK** in Android Studio

4. **Distribute** new version to users

---

## Need Help?

- **APK too large?** Enable code shrinking (already configured in release build)
- **Build fails?** Check Android Studio's "Build" tab for errors
- **Can't install?** Make sure old version is uninstalled first
- **Connection errors?** Verify backend is running: https://loctrack-api.onrender.com/api/health

---

**You're all set! Build the debug APK now to test with your production backend.** 🚀

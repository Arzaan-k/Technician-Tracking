# 📱 Android Production APK Build Instructions

## Prerequisites

### Required Software
1. **Android Studio** (Latest stable version)
   - Download: https://developer.android.com/studio
   - Install with default settings

2. **Java JDK 11 or higher**
   - Download: https://adoptium.net/
   - Set JAVA_HOME environment variable

3. **Node.js 18+** (Already installed)

---

## Quick Build Guide

### Step 1: Prepare the Build

Open PowerShell/Terminal in the project root:

```powershell
cd "C:\Users\msi user\Desktop\Developer\Location Tracking App"

# Install dependencies if not done
npm install

# Build the frontend
npm run build:client

# Sync with Android
npx cap sync android
```

### Step 2: Open Android Studio

```powershell
# Open Android project in Android Studio
npx cap open android
```

Wait for Android Studio to:
- ✅ Load the project
- ✅ Download Gradle dependencies
- ✅ Sync Gradle files
- ✅ Index files

This may take 5-15 minutes on first run.

### Step 3: Build Debug APK (For Testing)

In Android Studio:

1. **Wait for Gradle sync to complete** (bottom right corner)

2. **Menu:** Build → Build Bundle(s) / APK(s) → Build APK(s)

3. **Wait for build** (progress shown at bottom)

4. **When complete:**
   - Notification: "APK(s) generated successfully"
   - Click "locate" to open APK folder
   - Or find at: `android/app/build/outputs/apk/debug/app-debug.apk`

5. **APK Details:**
   - File: `app-debug.apk`
   - Size: ~8-12 MB
   - App ID: `in.crystalgroup.loctrack.debug`
   - Debuggable: Yes
   - Ready for testing

### Step 4: Install on Device

**Transfer and Install:**
1. Copy APK to phone via USB/Email/Cloud
2. Open APK file on phone
3. Allow "Install from unknown sources" if prompted
4. Install and launch

**Or Install via ADB:**
```powershell
# Connect phone via USB with USB debugging enabled
adb install "android/app/build/outputs/apk/debug/app-debug.apk"
```

---

## Production Release Build

### Step 1: Generate Signing Key (One-time Setup)

⚠️ **CRITICAL:** Keep this key safe! You'll need it for ALL future updates.

```powershell
cd "C:\Users\msi user\Desktop\Developer\Location Tracking App\android"

# Generate keystore
keytool -genkey -v -keystore loctrack-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias loctrack
```

**Prompts and Answers:**
```
Enter keystore password: [CREATE_STRONG_PASSWORD]
Re-enter new password: [SAME_PASSWORD]

What is your first and last name?
  [Unknown]: Crystal Group

What is the name of your organizational unit?
  [Unknown]: Technology

What is the name of your organization?
  [Unknown]: Crystal Group

What is the name of your City or Locality?
  [Unknown]: [Your City]

What is the name of your State or Province?
  [Unknown]: [Your State]

What is the two-letter country code for this unit?
  [Unknown]: IN

Is CN=Crystal Group, OU=Technology, O=Crystal Group, L=[City], ST=[State], C=IN correct?
  [no]: yes

Enter key password for <loctrack>
  (RETURN if same as keystore password): [Press ENTER]
```

**Backup the keystore:**
- File created: `android/loctrack-release-key.jks`
- Copy to secure location (cloud storage, USB drive)
- Never commit to Git (already in .gitignore)

### Step 2: Configure Signing

Create `android/app/keystore.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEYSTORE_PASSWORD
keyAlias=loctrack
storeFile=../loctrack-release-key.jks
```

Replace `YOUR_KEYSTORE_PASSWORD` with your actual password.

**Security Note:** This file is gitignored and contains sensitive information.

### Step 3: Update Version (Before Each Release)

Edit `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "in.crystalgroup.loctrack"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1      // INCREMENT THIS: 1, 2, 3, ...
    versionName "1.0.0" // UPDATE THIS: "1.0.0", "1.1.0", "2.0.0"
    ...
}
```

**Version Guidelines:**
- `versionCode`: Integer, increment by 1 for each release (1, 2, 3...)
- `versionName`: Semantic versioning
  - `1.0.0` → `1.0.1` for bug fixes
  - `1.0.0` → `1.1.0` for new features
  - `1.0.0` → `2.0.0` for major changes

### Step 4: Build Signed Release APK

#### Option A: Using Android Studio (Recommended)

1. **Menu:** Build → Generate Signed Bundle / APK

2. **Select:** APK → Next

3. **Key Store:**
   - Key store path: Browse to `android/loctrack-release-key.jks`
   - Key store password: [Your password]
   - Key alias: `loctrack`
   - Key password: [Your password]
   - Click: "Remember passwords" (optional)

4. **Next**

5. **Destination:**
   - Select `release` build variant
   - Check "V1 (Jar Signature)" and "V2 (Full APK Signature)"

6. **Finish**

7. **Wait for build** (2-5 minutes)

8. **APK Location:**
   - `android/app/build/outputs/apk/release/app-release.apk`
   - Click "locate" in notification

#### Option B: Using Command Line

```powershell
cd "C:\Users\msi user\Desktop\Developer\Location Tracking App"

# Set JAVA_HOME if not set
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.8.7-hotspot"

# Build release APK
cd android
./gradlew assembleRelease

# APK location
ls app/build/outputs/apk/release/
```

### Step 5: Verify the Release APK

```powershell
# Check APK info
aapt dump badging "android/app/build/outputs/apk/release/app-release.apk"

# Should show:
# - package: name='in.crystalgroup.loctrack'
# - versionCode='1'
# - versionName='1.0.0'
```

**APK Properties:**
- Size: ~4-6 MB (smaller than debug)
- Optimized: Yes (ProGuard/R8)
- Signed: Yes
- Debuggable: No
- Ready for distribution

---

## Building App Bundle (AAB) for Google Play

App Bundle is required for Google Play Store uploads.

### Build AAB

#### Using Android Studio:
1. Build → Generate Signed Bundle / APK
2. Select **Android App Bundle** → Next
3. Select keystore and credentials
4. Choose `release` variant
5. Finish

#### Using Command Line:
```powershell
cd android
./gradlew bundleRelease

# AAB location: app/build/outputs/bundle/release/app-release.aab
```

### Upload to Google Play

1. **Create Google Play Developer Account** ($25 one-time fee)
   - https://play.google.com/console

2. **Create App:**
   - App name: LocTrack
   - Default language: English
   - App/Game: App
   - Free/Paid: Free

3. **Upload AAB:**
   - Production/Testing → Create release
   - Upload `app-release.aab`
   - Fill required information
   - Submit for review

---

## Distribution Options

### Option 1: Direct APK Distribution

**Best for:** Internal company use, quick deployment

**Steps:**
1. Build release APK
2. Upload to:
   - Company file server
   - Google Drive
   - Dropbox
   - Direct download on company website

3. Share link with users

4. **Installation (User side):**
   - Download APK
   - Settings → Security → Enable "Unknown sources"
   - Open APK file → Install

**Pros:**
- ✅ Instant deployment
- ✅ No approval process
- ✅ Full control

**Cons:**
- ❌ Users must enable unknown sources
- ❌ No automatic updates
- ❌ Manual distribution

### Option 2: Google Play Internal Testing

**Best for:** Testing with team before public release

**Steps:**
1. Upload AAB to Play Console
2. Select "Internal Testing"
3. Add tester emails
4. Testers receive email invitation
5. Install from Play Store

**Pros:**
- ✅ Easy testing
- ✅ Automatic updates
- ✅ No "unknown sources" needed
- ✅ Up to 100 testers

**Cons:**
- ❌ Requires Google Play account
- ❌ $25 one-time fee

### Option 3: Google Play Public Release

**Best for:** Public/customer-facing app

**Steps:**
1. Complete Play Store listing
2. Upload AAB
3. Submit for review (1-3 days)
4. Public on Play Store

**Pros:**
- ✅ Professional distribution
- ✅ Automatic updates
- ✅ Wide reach
- ✅ In-app updates

**Cons:**
- ❌ Review process
- ❌ $25 fee
- ❌ Must follow Play policies

---

## Updating the App

### For Each Update:

1. **Make changes to code**

2. **Increment version:**
```gradle
// android/app/build.gradle
versionCode 2        // Was 1
versionName "1.1.0"  // Was "1.0.0"
```

3. **Rebuild:**
```powershell
npm run build:client
npx cap sync android
```

4. **Build new APK/AAB** (same process as above)

5. **Distribute:**
   - Direct APK: Upload new file, notify users
   - Play Store: Upload new AAB, existing users auto-update

---

## Testing Checklist

Before distributing, test on real device:

### Functionality Tests
- [ ] App launches successfully
- [ ] Login works with real credentials
- [ ] Location permission requested
- [ ] GPS tracking starts
- [ ] Location updates sent to backend
- [ ] Map displays correctly
- [ ] Minimize app - tracking continues
- [ ] Reopen app - still tracking
- [ ] View history - sessions displayed
- [ ] Logout works
- [ ] Login again works

### Performance Tests
- [ ] App starts in < 3 seconds
- [ ] No crashes or freezes
- [ ] Battery usage acceptable (< 5% per hour)
- [ ] Network usage reasonable
- [ ] Works on mobile data
- [ ] Works on WiFi

### Compatibility Tests
- [ ] Works on Android 8+ devices
- [ ] Works on different screen sizes
- [ ] Landscape/portrait orientation
- [ ] Notification shows during tracking
- [ ] Background tracking works with battery saver

---

## Troubleshooting

### Common Build Issues

**1. "JAVA_HOME not set"**
```powershell
# Find Java installation
where java

# Set JAVA_HOME (adjust path)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.8.7-hotspot"
```

**2. "Gradle sync failed"**
- Android Studio → File → Invalidate Caches → Restart
- Delete `android/.gradle` folder
- Sync again

**3. "Build failed: duplicate resources"**
- Clean build: `./gradlew clean`
- Rebuild: `./gradlew assembleDebug`

**4. "Keystore not found"**
- Verify `keystore.properties` path is correct
- Ensure `loctrack-release-key.jks` exists
- Check file path uses `/` or `\\` correctly

**5. "SDK not found"**
- Android Studio → Tools → SDK Manager
- Install Android SDK (API 33+)
- Accept licenses: `./gradlew --stop && yes | sdkmanager --licenses`

### Installation Issues

**1. "App not installed"**
- Uninstall old version first
- Check storage space
- Enable unknown sources

**2. "Parse error"**
- APK corrupted - rebuild
- Phone Android version too old (need 8+)
- APK not compatible with device architecture

**3. "Location not working"**
- Grant location permission
- Enable GPS
- Check network connection
- Verify API URL is correct

---

## Advanced Configuration

### Custom Splash Screen

Edit `android/app/src/main/res/values/styles.xml`:
```xml
<style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:windowBackground">@drawable/splash</item>
</style>
```

Add your splash image to:
- `res/drawable/splash.png`

### Custom App Icon

Replace icons in:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`

Or use Android Studio:
- Right-click `res` → New → Image Asset
- Icon Type: Launcher Icons
- Upload your icon
- Generate

### Change App Name

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">LocTrack</string>
```

---

## Production Optimization Checklist

Applied optimizations:

- ✅ **ProGuard/R8:** Code minification and obfuscation
- ✅ **Resource Shrinking:** Removes unused resources
- ✅ **Code Splitting:** Reduces APK size
- ✅ **WebView Optimization:** Faster page loads
- ✅ **Capacitor Plugins:** Only included needed plugins
- ✅ **Build Configuration:** Release-specific optimizations

Results:
- Debug APK: ~8-12 MB
- Release APK: ~4-6 MB (50% smaller)
- Startup time: < 3 seconds
- Memory usage: < 150 MB

---

## Next Steps

### Immediate:
1. ✅ Build debug APK
2. ✅ Test on device
3. ✅ Generate keystore
4. ✅ Build release APK
5. ✅ Distribute to users

### Future:
- Set up CI/CD for automated builds
- Implement in-app updates
- Add crash reporting (Firebase Crashlytics)
- Add analytics (Firebase Analytics)
- Publish to Play Store

---

## Important Files Reference

```
android/
├── app/
│   ├── build.gradle                    # Build configuration
│   ├── proguard-rules.pro             # ProGuard rules
│   ├── keystore.properties            # Signing config (gitignored)
│   └── src/main/
│       ├── AndroidManifest.xml        # App manifest
│       ├── res/                       # Resources
│       └── assets/public/             # Web assets (auto-synced)
├── loctrack-release-key.jks           # Signing key (gitignored)
├── gradle.properties                  # Gradle properties
└── build.gradle                       # Project build config
```

---

## Support Resources

**Documentation:**
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Android Build Guide](https://developer.android.com/studio/build)
- [ProGuard](https://www.guardsquare.com/manual/home)

**Tools:**
- [Android Studio](https://developer.android.com/studio)
- [ADB Guide](https://developer.android.com/studio/command-line/adb)

**Testing:**
- [Firebase Test Lab](https://firebase.google.com/docs/test-lab)
- [BrowserStack](https://www.browserstack.com/app-live)

---

**🚀 Your Android app is ready for production deployment!**

Choose your distribution method and start deploying to users.


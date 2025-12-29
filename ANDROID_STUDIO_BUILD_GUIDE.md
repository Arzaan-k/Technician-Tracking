# 📱 Android Studio - Build Production APK Guide

**Android Studio is now opening...**

---

## 🎯 Step-by-Step Instructions

### Wait for Gradle Sync (IMPORTANT!)

1. Android Studio will open and show a loading screen
2. Wait for **Gradle sync** to complete (bottom status bar)
3. This may take 2-5 minutes on first run
4. You'll see "Gradle sync completed successfully" message

### Build Signed APK

Once Gradle sync is complete:

#### Step 1: Start Build Process

1. In Android Studio, go to the top menu
2. Click **Build** → **Generate Signed Bundle / APK**
3. A dialog will appear

#### Step 2: Select APK

1. Select **APK** (not Bundle)
2. Click **Next**

#### Step 3: Create New Keystore

Since this is your first build:

1. Click **Create new...**
2. A "New Key Store" dialog opens

**Fill in the following:**

**Key store path:**
- Click folder icon
- Navigate to: `C:\Users\msi user\Desktop\Developer\Location Tracking App`
- Enter filename: `loctrack-release-key.jks`
- Click **OK**

**Key store password:**
- Enter a STRONG password (minimum 6 characters)
- **IMPORTANT:** Write this down somewhere safe!

**Confirm password:**
- Re-enter the same password

**Key:**
- **Alias:** `loctrack`
- **Password:** Same as keystore password (or different, your choice)
- **Confirm:** Re-enter password
- **Validity (years):** `25`

**Certificate:**
- **First and Last Name:** `Crystal Group`
- **Organizational Unit:** `IT`
- **Organization:** `Crystal Group India`
- **City or Locality:** `Your City` (e.g., Mumbai, Delhi, etc.)
- **State or Province:** `Your State` (e.g., Maharashtra, etc.)
- **Country Code (XX):** `IN`

3. Click **OK**

#### Step 4: Select Build Variant

1. You'll be back at the "Generate Signed Bundle or APK" dialog
2. Your keystore path should be filled in
3. Enter your keystore password
4. Select key alias: `loctrack`
5. Enter key password
6. Check **"Remember passwords"** (optional, for convenience)
7. Click **Next**

#### Step 5: Build Configuration

1. **Destination Folder:** Leave as default or choose location
2. **Build Variants:** Check **release**
3. **Signature Versions:** Check both V1 and V2
4. Click **Finish**

#### Step 6: Wait for Build

- Build process will start
- Progress shown in bottom right corner
- Takes 2-5 minutes depending on your system
- When complete, you'll see: **"locate"** link or notification

---

## 🎉 APK Location

After successful build, your APK will be at:

```
C:\Users\msi user\Desktop\Developer\Location Tracking App\android\app\build\outputs\apk\release\app-release.apk
```

Or use the **locate** link in the notification to open the folder directly.

---

## ✅ Verify Your APK

### File Details

Check your APK file:
- **Filename:** `app-release.apk`
- **Size:** Should be 10-50 MB
- **Signed:** Yes (with your keystore)

### Test Installation

1. **Transfer to phone:**
   - Connect phone via USB
   - Copy APK to phone storage
   - Or send via WhatsApp/Email to yourself

2. **Install on phone:**
   - Open file manager on phone
   - Find the APK file
   - Tap to install
   - Allow "Install from unknown sources" if prompted
   - Grant location permissions when app starts

3. **Test all features:**
   - [ ] Login works
   - [ ] Location tracking starts
   - [ ] Background tracking continues
   - [ ] Can see history
   - [ ] All UI elements work

---

## 🔄 Alternative: Build from Terminal

If Android Studio method doesn't work, try this:

### Set JAVA_HOME First

```powershell
# Find Android Studio's JDK
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

# Verify it's set
echo $env:JAVA_HOME
```

### Build APK

```bash
cd android
.\gradlew.bat assembleRelease
```

**Note:** You'll need to set up signing configuration first (see PRODUCTION_DEPLOYMENT.md)

---

## 🔒 CRITICAL: Save Your Keystore!

**BACKUP YOUR KEYSTORE FILE IMMEDIATELY!**

Your keystore file (`loctrack-release-key.jks`) is **CRITICAL**:

1. **Without it, you CANNOT update your app**
2. **Lost keystore = can't publish updates to Play Store**
3. **No way to recover if lost**

**Backup locations (do ALL of these):**
- ✅ Cloud storage (Google Drive, Dropbox, OneDrive)
- ✅ External hard drive
- ✅ Email to yourself
- ✅ USB drive

**Also save:**
- Keystore password
- Key alias: `loctrack`
- Key password

**Recommended: Create a secure note with:**
```
LocTrack Keystore Credentials
=============================
Keystore File: loctrack-release-key.jks
Keystore Password: [YOUR_PASSWORD]
Key Alias: loctrack
Key Password: [YOUR_KEY_PASSWORD]
Created: 2025-12-29
Location: C:\Users\msi user\Desktop\Developer\Location Tracking App\
```

---

## 🚨 Common Issues & Solutions

### Issue: "Gradle sync failed"

**Solution:**
1. Click **File** → **Invalidate Caches** → **Invalidate and Restart**
2. Wait for Android Studio to restart
3. Let Gradle sync again

### Issue: "SDK not found"

**Solution:**
1. Go to **Tools** → **SDK Manager**
2. Install **Android SDK Platform 33** or higher
3. Click **Apply** → **OK**
4. Restart Gradle sync

### Issue: "Build failed with error"

**Solution:**
1. Check the **Build** tab at bottom
2. Read the error message
3. Common fix: **Build** → **Clean Project** → **Build** → **Rebuild Project**

### Issue: "Cannot create keystore"

**Solution:**
- Ensure you have write permissions to the folder
- Try creating keystore in a different location (like Desktop)
- Move it to project folder after creation

---

## 📊 Build Configurations

**Debug Build (for testing):**
- Not signed with production key
- Larger file size
- Has debugging symbols

**Release Build (for distribution):**
- Signed with your keystore
- Optimized and minified
- Smaller file size
- This is what you're building now

---

## 🎯 Next Steps After Build

1. ✅ **Test APK** on your phone
2. ✅ **Verify all features work**
3. ✅ **Backup keystore file**
4. ⏳ **Deploy backend** to Render.com
5. ⏳ **Rebuild APK** with production backend URL
6. ⏳ **Distribute** to all technicians

---

## 💡 Pro Tips

1. **Always build release APK** for distribution, never debug
2. **Test on multiple devices** if possible
3. **Keep version codes** incrementing for updates
4. **Document every release** with changelog
5. **Use semantic versioning** (1.0.0, 1.1.0, 2.0.0, etc.)

---

## 📞 Need Help?

If you encounter any issues:

1. Check the **Build Output** tab in Android Studio
2. Google the specific error message
3. Ensure your keystore details are correct
4. Try **Clean Project** → **Rebuild Project**
5. Restart Android Studio

---

✅ **Android Studio is ready! Follow the steps above to build your production APK.**

**Estimated Time:** 5-10 minutes for first-time build

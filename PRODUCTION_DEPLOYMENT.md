# 🚀 LocTrack Production Deployment Guide

This guide will help you deploy **LocTrack** as a production-ready mobile app for end users.

## 📋 Overview

| Component | Technology | Deployment |
|-----------|------------|------------|
| Mobile App | React + Capacitor | Android APK/Play Store |
| Backend API | Node.js + Express | Render.com (or similar) |
| Database | PostgreSQL | Neon/Render/Supabase |

---

## Part 1: Backend Deployment (Render.com)

Since you already have your database on your existing Service Hub server, we'll deploy the backend to Render.

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Production deployment setup"
git push origin main
```

### Step 2: Create Render Account & Deploy

1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** `loctrack-api`
   - **Region:** Singapore (closest to India)
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Starter $7/month for better performance)

### Step 3: Set Environment Variables on Render

In Render dashboard → Your service → **Environment**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | (Generate: `openssl rand -hex 32`) |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `CORS_ORIGIN` | `*` (for mobile app) |

### Step 4: Get Your Production API URL

After deployment, Render will give you a URL like:
```
https://loctrack-api.onrender.com
```

---

## Part 2: Update App for Production

### Step 1: Update API Configuration

Edit `src/lib/api.ts` to use your production URL:

```typescript
// Production API URL
const PRODUCTION_API_URL = 'https://loctrack-api.onrender.com/api';

// In production, use relative URL. In development, use localhost
const LOCAL_DEV_IP = '192.168.1.143'; // Your computer's local IP address
const API_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? PRODUCTION_API_URL :
        (Capacitor.isNativePlatform() ? `http://${LOCAL_DEV_IP}:3000/api` : 'http://localhost:3000/api'));
```

### Step 2: Update App Identity

Edit `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'in.crystalgroup.loctrack',  // Use your domain reversed
  appName: 'LocTrack',
  webDir: 'dist',
  plugins: {
    AndroidForegroundService: {
      foregoundServiceType: "location",
    },
  },
  server: {
    // For production, don't set any server config
    // For development only, uncomment and set your local IP
    // url: 'http://192.168.1.143:5173',
  }
};
```

---

## Part 3: App Icons & Splash Screen

### Step 1: Create Your App Icon

You need a **1024x1024 PNG** icon for your app. Place it in:
```
resources/icon.png
```

### Step 2: Generate All Icon Sizes

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#1e40af' --splashBackgroundColor '#1e40af'
```

This generates:
- All Android icon sizes (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Adaptive icons for Android 8+
- Splash screens for all densities

---

## Part 4: Build Signed APK for Distribution

### Step 1: Generate Signing Key

Run this command once (keep the keystore file safe!):

```bash
keytool -genkey -v -keystore loctrack-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias loctrack
```

You'll be asked for:
- **Keystore password:** (remember this!)
- **Your name:** Crystal Group
- **Organization:** Crystal Group India
- **City:** Your city
- **State:** Your state
- **Country:** IN

### Step 2: Configure Signing in Android

Create `android/app/keystore.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=loctrack
storeFile=../loctrack-release-key.jks
```

Update `android/app/build.gradle` to add signing config:

```gradle
android {
    ...
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("app/keystore.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build Production APK

```bash
# 1. Build the web app
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Build release APK
cd android
./gradlew assembleRelease
```

Your APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Build for Play Store (AAB)

For Google Play Store, build an Android App Bundle:

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Part 5: Testing Production Build

### Test Locally First

1. Transfer APK to your phone
2. Install it (enable "Install from unknown sources")
3. Open the app and verify:
   - ✅ Login works with your production database
   - ✅ Location tracking starts properly
   - ✅ Background tracking continues when app is minimized
   - ✅ All features work as expected

---

## Part 6: Google Play Store Submission (Optional)

1. Create a [Google Play Developer Account](https://play.google.com/console) ($25 one-time fee)
2. Create a new app listing
3. Upload your AAB file
4. Fill in:
   - App description
   - Screenshots (phone sizes)
   - Privacy policy URL
   - App category (Business/Productivity)
5. Submit for review

---

## 📱 Quick Commands Reference

```bash
# Development
npm run dev                    # Run frontend dev server
cd server && npm run dev       # Run backend dev server

# Production Build
npm run build                  # Build frontend
npx cap sync                   # Sync with Capacitor

# Android
npx cap open android           # Open in Android Studio
cd android && ./gradlew assembleRelease    # Build APK
cd android && ./gradlew bundleRelease      # Build AAB (Play Store)
```

---

## 🔒 Security Checklist

- [ ] Use a strong JWT_SECRET in production
- [ ] Keep your keystore.jks file safe and backed up
- [ ] Never commit .env or keystore files to git
- [ ] Use HTTPS for all API calls (Render provides this)
- [ ] Set proper CORS origins for production

---

## 🎯 Next Steps

1. **Deploy backend to Render** → Get your production API URL
2. **Update API URL in app** → Point to production backend
3. **Create app icon** → Generate all sizes
4. **Generate signing key** → For APK signing
5. **Build release APK** → Test on real devices
6. **Distribute to users** → Direct APK or Play Store

Need help with any step? Just ask!

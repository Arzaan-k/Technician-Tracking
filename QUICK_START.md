# ⚡ LocTrack - Quick Start Guide

## 🎯 Everything You Need in One Place

### 📦 Repository
**GitHub:** https://github.com/Arzaan-k/Technician-Tracking.git  
**Status:** ✅ All production files pushed and ready

---

## 🚀 Deploy in 5 Minutes

### Option 1: Docker (Fastest for Testing)

```bash
# 1. Clone
git clone https://github.com/Arzaan-k/Technician-Tracking.git
cd Technician-Tracking

# 2. Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# 3. Run
docker-compose up -d

# Done! Access at http://localhost:3000
```

### Option 2: Render.com (Best for Production)

1. Go to https://render.com
2. Create account (free)
3. New → Web Service
4. Connect GitHub: `Arzaan-k/Technician-Tracking`
5. Settings:
   - Build: `cd server && npm install`
   - Start: `node server/index.js`
6. Add PostgreSQL database (separate service)
7. Add environment variables:
   ```
   DATABASE_URL=[your postgres URL from Render]
   JWT_SECRET=[generate strong random string]
   NODE_ENV=production
   ```
8. Deploy!

### Option 3: Manual VPS

```bash
# On Ubuntu server
git clone https://github.com/Arzaan-k/Technician-Tracking.git
cd Technician-Tracking

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Setup
npm install
cd server && npm install && cd ..

# Configure
cp server/.env.example server/.env
nano server/.env  # Add your database credentials

# Build frontend
npm run build:client

# Start
cd server
pm2 start index.js --name loctrack
pm2 save
pm2 startup

# Done! Access at http://your-server-ip:3000
```

---

## 📱 Build Android APK in 3 Steps

### Prerequisites
- Android Studio installed
- Java JDK 11+ installed

### Steps

```bash
# 1. Build and sync
npm run build:client
npx cap sync android

# 2. Open Android Studio
npx cap open android

# 3. In Android Studio
# Build → Build Bundle(s) / APK(s) → Build APK(s)
# Wait ~2-3 minutes
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

**Install on phone:**
1. Copy APK to phone
2. Enable "Unknown sources"
3. Install and open

**For production (signed APK):**
See `ANDROID_BUILD_INSTRUCTIONS.md` for generating keystore and building release APK.

---

## 🔐 Essential Environment Variables

### Backend (server/.env)

```env
# Database - Choose ONE method:
# Method A: Full URL (Render, Heroku style)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Method B: Individual (Docker, K8s style)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=location_tracking
DB_USER=postgres
DB_PASSWORD=your-password

# Security (REQUIRED)
JWT_SECRET=your-super-secret-minimum-32-characters-long
NODE_ENV=production
PORT=3000
```

---

## ✅ Quick Test Checklist

### Backend
```bash
# Health check
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}

# API test
curl http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Frontend
1. Open browser: http://localhost:3000
2. Should see login page
3. Try logging in with test credentials

### Android App
1. Install APK on phone
2. Open app
3. Login
4. Grant location permission
5. Start tracking
6. Check location updates in backend/admin panel

---

## 📚 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **DEPLOYMENT_SUMMARY.md** | Complete overview | Start here |
| **PRODUCTION_BUILD_GUIDE.md** | Build all platforms | Building for production |
| **ANDROID_BUILD_INSTRUCTIONS.md** | Android APK | Building Android app |
| **GITHUB_SETUP.md** | Git workflow | Team collaboration |
| **QUICK_START.md** | This file | Quick deployment |
| **BUILD_APK_GUIDE.md** | Quick APK reference | Fast Android build |
| **DEPLOYMENT-CHECKLIST.md** | Step by step | Systematic deployment |

---

## 🆘 Common Issues

### Issue: Backend won't start
```bash
# Check environment
cat server/.env

# Verify Node version (need 18+)
node --version

# Check logs
pm2 logs loctrack  # If using PM2
# or
node server/index.js  # Direct run to see errors
```

### Issue: Database connection fails
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Common fixes:
# - Check DATABASE_URL is correct
# - Verify database exists
# - Check firewall allows connection
# - Ensure SSL setting matches database requirement
```

### Issue: Android build fails
```bash
# Check Java
java -version  # Need JDK 11+

# Set JAVA_HOME
# Windows:
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"

# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

### Issue: Frontend blank page
```bash
# Rebuild
npm run build:client

# Check if API URL is correct
# In browser console (F12) look for API errors

# If using separate frontend hosting, set API URL:
echo "VITE_API_URL=https://your-backend.com" > .env
npm run build:client
```

---

## 🎯 Production Deployment Checklist

### Pre-Deploy
- [ ] Code pushed to GitHub ✅
- [ ] Environment variables prepared
- [ ] Database created
- [ ] Domain/SSL configured (if needed)

### Deploy
- [ ] Backend deployed and running
- [ ] Database initialized with schema
- [ ] Health check responding
- [ ] API endpoints working

### Post-Deploy
- [ ] Test login functionality
- [ ] Test location tracking
- [ ] Test admin dashboard
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerts
- [ ] Configure backups

### Android
- [ ] Built production APK
- [ ] Tested on real device
- [ ] Distributed to users

---

## 📊 Performance Expectations

### Backend
- Response time: < 100ms (typical)
- Concurrent users: 100+ (default config)
- Database connections: 10 (pooled)

### Frontend
- Load time: < 2 seconds
- Bundle size: 620 KB (~194 KB gzipped)
- PWA: Yes, offline capable

### Android
- APK size: 4-6 MB (release), 8-12 MB (debug)
- Startup: < 3 seconds
- Battery: < 5% per hour (tracking)
- Min Android: 7.0 (API 24)

---

## 🔗 Quick Links

**Code:**
- Repository: https://github.com/Arzaan-k/Technician-Tracking
- Issues: https://github.com/Arzaan-k/Technician-Tracking/issues

**Deployment Platforms:**
- Render.com: https://render.com
- DigitalOcean: https://www.digitalocean.com/products/app-platform
- AWS: https://aws.amazon.com

**Documentation:**
- Capacitor: https://capacitorjs.com/docs
- Vite: https://vitejs.dev
- React: https://react.dev
- Express: https://expressjs.com

---

## 💡 Pro Tips

1. **Use Render.com for quickest production deployment**
   - Free tier available
   - Auto-deploy from GitHub
   - Managed PostgreSQL included

2. **For Android, build debug APK first**
   - Test thoroughly before creating release build
   - Release build requires keystore (one-time setup)

3. **Monitor your app from day one**
   - Set up error logging (Sentry, LogRocket)
   - Use PM2 for process monitoring
   - Enable health check monitoring

4. **Keep secrets safe**
   - Never commit .env files
   - Use environment variables everywhere
   - Backup keystore securely

5. **Update regularly**
   - Check for security updates weekly
   - Keep dependencies updated
   - Test before deploying updates

---

## 🎉 You're Ready!

Everything is prepared and documented. Choose your deployment method above and get started!

**For detailed instructions on any step, refer to the comprehensive guides listed in the Documentation Index.**

---

**Need help?** Check the documentation or create an issue on GitHub.

**Happy Deploying! 🚀**


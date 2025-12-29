# 🚀 Production Build & Deployment Guide - LocTrack

This comprehensive guide covers building production-ready versions of the LocTrack application for all platforms.

## Table of Contents
1. [Frontend Production Build](#frontend-production-build)
2. [Backend Production Deployment](#backend-production-deployment)
3. [Android App Production Build](#android-app-production-build)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment Options](#cloud-deployment-options)

---

## Frontend Production Build

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Build Steps

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Build optimized production frontend
npm run build:client

# The output will be in the 'dist' folder
# Files are optimized, minified, and ready for production
```

### Build Optimizations Included
✅ Code splitting with manual chunks  
✅ Terser minification with console/debugger removal  
✅ Tree shaking for smaller bundle size  
✅ PWA support with service worker  
✅ Lazy loading for routes  
✅ Asset optimization  

### Verification
```bash
# Preview the production build locally
npm run preview
```

---

## Backend Production Deployment

### Environment Setup

1. **Create `.env` file in `server/` directory:**

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration (Option 1: Individual settings)
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=location_tracking
DB_USER=your-username
DB_PASSWORD=your-secure-password
DB_SSL=true

# OR Database Configuration (Option 2: Connection URL)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
```

2. **Install production dependencies:**

```bash
cd server
npm ci --production
```

3. **Initialize database:**

```bash
node init-db.js
```

4. **Start production server:**

```bash
npm start
# Or with PM2 for process management:
pm2 start index.js --name loctrack-api
```

### Production Best Practices
- ✅ Use environment variables (never commit `.env`)
- ✅ Enable HTTPS/SSL
- ✅ Use a process manager (PM2, systemd)
- ✅ Set up monitoring and logging
- ✅ Configure rate limiting
- ✅ Enable security headers (already configured with Helmet)

---

## Android App Production Build

### Method 1: Debug APK (For Testing)

**Requirements:**
- Android Studio installed
- Java JDK 11+ installed

**Steps:**

1. **Sync Capacitor:**
```bash
npx cap sync android
```

2. **Open in Android Studio:**
```bash
npx cap open android
```

3. **Build Debug APK:**
   - Wait for Gradle sync to complete
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Method 2: Signed Release APK (For Production)

#### Step 1: Generate Signing Key (One-time)

```bash
cd android

# Generate release keystore
keytool -genkey -v -keystore loctrack-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias loctrack

# Answer the prompts:
# - Keystore password: [CREATE STRONG PASSWORD]
# - Re-enter password: [SAME PASSWORD]
# - First and last name: Crystal Group
# - Organizational unit: Technology
# - Organization: Crystal Group
# - City/Locality: [Your City]
# - State/Province: [Your State]
# - Country code: IN
```

**⚠️ IMPORTANT:** 
- Keep `loctrack-release-key.jks` safe and secure
- Never commit it to version control
- Back it up securely - you'll need it for all future updates

#### Step 2: Configure Signing

Create `android/app/keystore.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEYSTORE_PASSWORD
keyAlias=loctrack
storeFile=../loctrack-release-key.jks
```

**Note:** This file is already gitignored for security.

#### Step 3: Build Signed Release APK

**Option A: Using Android Studio**
1. Build → Generate Signed Bundle / APK
2. Select APK → Next
3. Choose keystore file and enter credentials
4. Select `release` build variant
5. Finish

**Option B: Using Command Line**
```bash
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### Version Management

Before building a new release:

1. Update version in `android/app/build.gradle`:
```gradle
versionCode 2  // Increment by 1
versionName "1.1.0"  // Semantic versioning
```

2. Rebuild and sync:
```bash
npm run build:client
npx cap sync android
```

### Distribution Options

#### Option 1: Direct APK Distribution
- Upload APK to Google Drive/Dropbox
- Share link with users
- Users enable "Install from unknown sources"
- Users download and install

**Pros:** Instant, no fees  
**Cons:** Requires unknown sources, manual updates

#### Option 2: Google Play Internal Testing
- Create Google Play Developer account ($25 one-time)
- Build signed AAB (App Bundle)
- Upload to Play Console → Internal Testing
- Add testers by email

**Pros:** Professional, easy updates  
**Cons:** $25 fee, 1-2 days approval

#### Option 3: Google Play Store Public
- Same as Internal Testing
- Submit for Production review
- 1-3 days approval
- Public availability

---

## Docker Deployment

### Quick Start with Docker Compose

1. **Create `.env` file in project root:**
```bash
DB_NAME=location_tracking
DB_USER=loctrack
DB_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-domain.com
```

2. **Build and run:**
```bash
docker-compose up -d
```

3. **Check status:**
```bash
docker-compose ps
docker-compose logs -f app
```

### Services Included
- **PostgreSQL**: Database (port 5432)
- **App**: Backend + Frontend (port 3000)
- **Nginx**: Reverse proxy with SSL (ports 80, 443)

### SSL Configuration

For production, you need SSL certificates:

1. **Get certificates** (Let's Encrypt recommended):
```bash
# Using certbot
certbot certonly --standalone -d your-domain.com
```

2. **Copy certificates:**
```bash
mkdir ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
```

3. **Update nginx.conf** with your domain name

---

## Cloud Deployment Options

### Option 1: Render.com (Easiest)

**Backend:**
1. Create new Web Service
2. Connect GitHub repository
3. Build command: `cd server && npm install`
4. Start command: `node server/index.js`
5. Add environment variables
6. Choose paid plan for PostgreSQL

**Frontend:** Served by backend

### Option 2: AWS (EC2 + RDS)

**Database (RDS):**
```bash
# Create PostgreSQL RDS instance
# Note connection string
# Configure security groups
```

**Application (EC2):**
```bash
# Launch EC2 instance (Ubuntu 22.04)
ssh ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Setup environment
cp server/.env.example server/.env
nano server/.env  # Edit with your values

# Build frontend
npm install
npm run build:client

# Install backend dependencies
cd server
npm install

# Start with PM2
pm2 start index.js --name loctrack-api
pm2 startup
pm2 save
```

**Setup Nginx:**
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/loctrack
```

Add configuration from `nginx.conf` in this repo.

### Option 3: DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - Build command: `npm run build:all`
   - Run command: `node server/index.js`
3. Add environment variables
4. Add PostgreSQL database
5. Deploy

### Option 4: Kubernetes (For Scale)

Apply the provided Kubernetes configuration:

```bash
# Update secrets in kubernetes/deployment.yaml
kubectl apply -f kubernetes/deployment.yaml

# Check status
kubectl get pods -n loctrack
kubectl get services -n loctrack

# View logs
kubectl logs -f deployment/loctrack-app -n loctrack
```

---

## Post-Deployment Checklist

### Backend
- [ ] Database initialized with schema
- [ ] Environment variables configured
- [ ] HTTPS/SSL enabled
- [ ] CORS configured for frontend domain
- [ ] Health endpoint responding: `/health`
- [ ] API endpoints working: `/api/auth/login`
- [ ] Error logging configured
- [ ] Backup strategy in place

### Frontend
- [ ] Build successful with no errors
- [ ] Assets loading correctly
- [ ] API endpoint configured correctly
- [ ] Maps rendering properly
- [ ] PWA installable
- [ ] Service worker registered

### Android App
- [ ] Built with latest frontend
- [ ] Version number incremented
- [ ] API endpoint points to production
- [ ] Location permissions working
- [ ] Background tracking working
- [ ] Notifications working
- [ ] Tested on real device
- [ ] Battery usage acceptable

---

## Monitoring & Maintenance

### Health Checks

**Backend:**
```bash
curl https://your-domain.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Database:**
```bash
# Check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### Logs

**PM2:**
```bash
pm2 logs loctrack-api
pm2 monit
```

**Docker:**
```bash
docker-compose logs -f app
```

**Systemd:**
```bash
journalctl -u loctrack -f
```

### Backups

**Database:**
```bash
# Automated daily backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20231215.sql
```

### Updates

**Deploying Updates:**
```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild frontend
npm run build:client

# 3. Restart backend
pm2 restart loctrack-api

# 4. For Docker
docker-compose build
docker-compose up -d

# 5. For Android
npx cap sync android
# Build new APK with incremented version
```

---

## Troubleshooting

### Common Issues

**Build Fails:**
- Check Node.js version (need 18+)
- Clear cache: `rm -rf node_modules dist && npm install`
- Check for TypeScript errors

**Database Connection Fails:**
- Verify DATABASE_URL or DB_* variables
- Check firewall/security groups
- Verify SSL requirements

**Android Build Issues:**
- Ensure JAVA_HOME is set
- Run `./gradlew clean` in android folder
- Check Android Studio for detailed errors

**Location Not Tracking:**
- Check location permissions on device
- Verify API endpoint is accessible
- Check network connectivity
- Review app logs in Chrome DevTools (chrome://inspect)

---

## Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] Database credentials are secure
- [ ] HTTPS/SSL enabled
- [ ] CORS restricted to your domains
- [ ] Rate limiting enabled
- [ ] API keys not in source code
- [ ] Keystore file backed up securely
- [ ] Environment files not committed
- [ ] Security headers enabled
- [ ] SQL injection protected (using parameterized queries)
- [ ] Password hashing enabled (bcrypt)

---

## Performance Optimization

### Frontend
- ✅ Code splitting implemented
- ✅ Lazy loading routes
- ✅ Image optimization
- ✅ PWA caching strategy
- ✅ Gzip compression

### Backend
- ✅ Database connection pooling
- ✅ Query optimization with indexes
- ✅ Rate limiting
- ✅ Compression middleware
- ✅ Helmet security headers

### Android
- ✅ ProGuard minification
- ✅ Resource shrinking
- ✅ WebView optimization
- ✅ Background location optimization

---

## Support & Resources

**Documentation:**
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

**Deployment Guides:**
- [Render Deploy](https://render.com/docs)
- [AWS EC2 Setup](https://aws.amazon.com/ec2/getting-started/)
- [Digital Ocean Apps](https://docs.digitalocean.com/products/app-platform/)

**Monitoring:**
- [PM2 Guide](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Docker Monitoring](https://docs.docker.com/config/containers/logging/)

---

**🎉 You're now ready to deploy LocTrack to production!**

For questions or issues, refer to the individual documentation files in this repository or check the troubleshooting section above.


# 🚀 QUICK START: Centralized Authentication

## ⚡ 5-Minute Setup Guide

### Step 1: Update Technician Tracking `.env`
```bash
cd c:\Users\user\Downloads\Technician-Tracking\server
```

Ensure your `.env` file has:
```env
SERVICE_HUB_URL=http://localhost:5000
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
DATABASE_URL=postgresql://neondb_owner:npg_ls7YTgzeoNA4@ep-young-grass-aewvokzj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=3000
```

---

### Step 2: Add Auth Routes to Service Hub

#### A. Create `service-hub/server/routes/auth.js`

Copy the ENTIRE code from `SERVICE_HUB_AUTH_IMPLEMENTATION.md` section 1.

#### B. Update `service-hub/server/index.js`

Add these lines:
```javascript
import authRoutes from './routes/auth.js';

// ... after other middleware ...

app.use('/auth', authRoutes);
```

#### C. Update `service-hub/server/.env`

Add:
```env
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
PORT=5000
```

---

### Step 3: Start Both Servers

```powershell
# Terminal 1 - Service Hub
cd c:\Users\user\Downloads\service-hub\server
npm run dev

# Terminal 2 - Technician Tracking
cd c:\Users\user\Downloads\Technician-Tracking\server
npm run dev
```

---

### Step 4: Test It Works

```powershell
# Test Service Hub login directly
curl -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"tech@test.com\",\"password\":\"password123\"}"

# Test Technician Tracking proxied login
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"tech@test.com\",\"password\":\"password123\"}"
```

Both should return the SAME token! ✅

---

## 🎯 What You Get

✅ **Single Sign-On** - One login works everywhere  
✅ **Immediate Revocation** - Disable user once, blocks all systems  
✅ **Role-Based Access** - Only technicians can track  
✅ **Zero Duplicate Passwords** - Service Hub is the only source  
✅ **Consistent Tokens** - Same JWT across all systems  

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Service Hub unreachable" | Check Service Hub is running on port 5000 |
| "Invalid token" | Verify JWT_SECRET is IDENTICAL in both .env files |
| "Technician access required" | User role must be 'technician' in database |
| "Account disabled" | Set is_active = true in employees table |

---

## 📚 Full Documentation

- **Complete Guide**: `CENTRALIZED_AUTH_COMPLETE.md`
- **Service Hub Code**: `SERVICE_HUB_AUTH_IMPLEMENTATION.md`
- **Implementation Plan**: `.agent/workflows/centralized-auth-implementation.md`

---

**Ready to go!** 🚀 Follow the 4 steps above and you'll have centralized authentication working in minutes.

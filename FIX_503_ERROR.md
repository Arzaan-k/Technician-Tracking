# 🔧 QUICK FIX: 503 Service Unavailable Error

## Problem

You're getting a **503 Service Unavailable** error when trying to login because **Service Hub is not running**.

The error message:
```
:3000/api/auth/login:1  Failed to load resource: the server responded with a status of 503 (Service Unavailable)
```

This means Technician Tracking is running, but it can't reach Service Hub to validate the login.

---

## ✅ Solution

You need to **start BOTH servers**:

### Option 1: Automated Script (Recommended)

Run this script to start both servers automatically:

```powershell
cd c:\Users\user\Downloads\Technician-Tracking
.\start-both-servers.ps1
```

This will open TWO terminal windows:
- 🔵 **Service Hub** (Port 5000)
- 🟢 **Technician Tracking** (Port 3000)

**Keep both windows open!**

---

### Option 2: Manual Start

**Terminal 1 - Start Service Hub:**
```powershell
cd c:\Users\user\Downloads\service-hub
npm run dev
```

Wait for it to show: `serving on port 5000`

**Terminal 2 - Start Technician Tracking:**
```powershell
cd c:\Users\user\Downloads\Technician-Tracking\server
npm run dev
```

Wait for it to show: `Server running on port 3000`

---

## 🧪 Verify It's Working

Once both servers are running, test the connection:

```powershell
# Test Service Hub
curl http://localhost:5000/api/health

# Test Technician Tracking
curl http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d '{\"email\":\"admin@crystallgroup.in\",\"password\":\"your_password\"}'
```

---

## 📝 Why This Happens

The centralized authentication system works like this:

```
Frontend → Technician Tracking (Port 3000) → Service Hub (Port 5000)
```

When you try to login:
1. Frontend sends login request to Technician Tracking (port 3000)
2. Technician Tracking **proxies** the request to Service Hub (port 5000)
3. Service Hub validates the password and issues a JWT token
4. Token is returned to the frontend

**If Service Hub is not running**, step 2 fails with a 503 error.

---

## ✅ Checklist

- [ ] Service Hub is running on port 5000
- [ ] Technician Tracking is running on port 3000
- [ ] Both servers show "ready" messages in their terminals
- [ ] You can access http://localhost:5173 (frontend)
- [ ] Login works without 503 errors

---

## 🚀 Quick Start

Just run:

```powershell
.\start-both-servers.ps1
```

Then open http://localhost:5173 and try logging in!

---

## ⚠️ Important

**Service Hub MUST be running** for the centralized authentication to work. It's the single source of truth for all authentication.

If you only start Technician Tracking, login will fail with 503 because it can't reach Service Hub.

# 🚀 START SERVICE HUB - MANUAL INSTRUCTIONS

## Problem

You're getting **503 Service Unavailable** because Service Hub is not running.

The logs show:
```
🔄 Proxying login request to Service Hub for: auditor@crystalgroup.in
Login proxy error: Service Hub is unreachable. Please try again later.
```

---

## ✅ Solution: Start Service Hub

### **Open a NEW Terminal Window**

1. Press `Windows Key + R`
2. Type `powershell` and press Enter
3. Run these commands:

```powershell
cd c:\Users\user\Downloads\service-hub
npm run dev
```

### **Wait for Service Hub to Start**

You should see output like:
```
✅ Loaded .env.development with overrides
[SERVER] Setting up Vite development server
serving on port 5000
[SERVER] Server is now listening on all interfaces port 5000
```

### **Keep This Terminal Open!**

⚠️ **IMPORTANT**: Do NOT close this terminal window. Service Hub must keep running.

---

## 🧪 Test It Works

Once Service Hub is running, go back to your browser at http://localhost:5174 and try logging in again.

The 503 error should be gone! ✅

---

## 📊 How It Works

```
Your Browser (Port 5174)
    ↓
Technician Tracking (Port 3000) ← Currently Running ✅
    ↓
Service Hub (Port 5000) ← NEEDS TO BE STARTED ❌
```

Both servers need to be running for login to work!

---

## ⚠️ If npm run dev Doesn't Work

Try this alternative:

```powershell
cd c:\Users\user\Downloads\service-hub
npx cross-env NODE_ENV=development npx tsx server/index.ts
```

Or install dependencies first:

```powershell
cd c:\Users\user\Downloads\service-hub
npm install
npm run dev
```

---

## ✅ Success Checklist

- [ ] Service Hub terminal is open and running
- [ ] You see "serving on port 5000" message
- [ ] Technician Tracking is still running (port 3000)
- [ ] Browser shows http://localhost:5174
- [ ] Login works without 503 error

---

## 🎯 Quick Summary

**You need TWO terminal windows open:**

1. **Terminal 1**: Service Hub (Port 5000) ← START THIS NOW
2. **Terminal 2**: Technician Tracking (Port 3000) ← Already Running ✅

Once both are running, login will work! 🚀

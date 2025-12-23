# ⚡ QUICK START - CENTRALIZED AUTH

## 🎯 ONE COMMAND TO FIX EVERYTHING

Open a **NEW** PowerShell window and run:

```powershell
cd C:\Users\user\Downloads\service-hub; npm run dev
```

**That's it!** Keep the window open.

---

## ✅ Current Status

| Component | Status | Port |
|-----------|--------|------|
| Technician Tracking | ✅ RUNNING | 3000 |
| Service Hub | ❌ NOT RUNNING | 5000 |
| Frontend | ✅ RUNNING | 5174 |

---

## 🚨 The Problem

You're getting **503 errors** because Service Hub (port 5000) is not running.

---

## 🔧 The Solution

**Start Service Hub!**

### Method 1: Command Line
```powershell
cd C:\Users\user\Downloads\service-hub
npm run dev
```

### Method 2: Double-Click
Navigate to: `C:\Users\user\Downloads\service-hub`  
Double-click: `START_SERVICE_HUB.ps1`

---

## ✅ How to Verify It Works

### 1. Check Service Hub
```powershell
curl http://localhost:5000/api/health
```
Should return: `{"status":"healthy"}`

### 2. Try Login
Go to: http://localhost:5174  
Login with your credentials  
Should work without 503 errors! ✅

---

## 📊 What You Get

✅ Service Hub validates ALL passwords  
✅ Technician Tracking proxies auth requests  
✅ Same JWT works in both systems  
✅ Only technicians can access tracking  
✅ Disable user once, blocks everywhere  

---

## 🎉 Once Service Hub Starts

Everything will work perfectly:
- ✅ Login works
- ✅ No 503 errors
- ✅ Centralized authentication operational
- ✅ Role-based access enforced
- ✅ Immediate access revocation enabled

---

**Just start Service Hub and you're done!** 🚀

See `COMPLETE_SYSTEM_STATUS.md` for full details.

# 🚨 URGENT: START SERVICE HUB MANUALLY

## The Problem

You're seeing this error:
```
:3000/api/auth/login:1 Failed to load resource: the server responded with a status of 503 (Service Unavailable)
```

This means **Service Hub is NOT running**.

---

## ✅ SOLUTION (Takes 30 seconds)

### **Step 1: Open File Explorer**
- Press `Windows Key + E`

### **Step 2: Navigate to Service Hub**
- Go to: `C:\Users\user\Downloads\service-hub`

### **Step 3: Double-Click This File**
- Find: **`START_HERE.bat`**
- Double-click it
- A black window will open

### **Step 4: Wait for Success Message**
- You should see: `serving on port 5000`
- **KEEP THIS WINDOW OPEN!**

### **Step 5: Refresh Your Browser**
- Go back to http://localhost:5174
- Try logging in again
- **503 error should be GONE!** ✅

---

## 🔧 Alternative Method (If Double-Click Doesn't Work)

### **Open PowerShell:**
1. Press `Windows Key + R`
2. Type: `powershell`
3. Press Enter

### **Run These Commands:**
```powershell
cd C:\Users\user\Downloads\service-hub
npm run dev
```

### **Wait For:**
```
serving on port 5000
```

### **Keep Window Open!**

---

## 📊 What's Happening

```
Your Browser (http://localhost:5174)
         ↓
Technician Tracking (Port 3000) ✅ RUNNING
         ↓
Service Hub (Port 5000) ❌ NOT RUNNING ← THIS IS THE PROBLEM
```

**Service Hub MUST be running** for login to work!

---

## ✅ How to Know It's Working

### **Check 1: Service Hub Window Shows**
```
serving on port 5000
[SERVER] Server is now listening on all interfaces port 5000
```

### **Check 2: Test in PowerShell**
```powershell
curl http://localhost:5000/api/health
```
Should return: `{"status":"healthy",...}`

### **Check 3: Login Works**
- Go to http://localhost:5174
- Enter your credentials
- **No 503 error!** ✅
- You're logged in!

---

## 🎯 Quick Checklist

- [ ] Navigate to `C:\Users\user\Downloads\service-hub`
- [ ] Double-click `START_HERE.bat`
- [ ] See "serving on port 5000" message
- [ ] Keep the window open
- [ ] Refresh browser
- [ ] Try logging in
- [ ] Success! ✅

---

## ⚠️ IMPORTANT

**You need TWO windows running:**

1. **Technician Tracking** (Port 3000) - ✅ Already running
2. **Service Hub** (Port 5000) - ❌ You need to start this NOW

Both must be running for centralized authentication to work!

---

## 🚀 Once Service Hub Starts

Everything will work:
- ✅ Login works without errors
- ✅ Service Hub validates passwords
- ✅ JWT tokens are issued
- ✅ Centralized authentication operational
- ✅ Role-based access enforced

---

## 📞 Still Not Working?

### **Check if something is using port 5000:**
```powershell
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
```

### **If port is in use, kill it:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

### **Then try starting Service Hub again**

---

**JUST DOUBLE-CLICK `START_HERE.bat` AND KEEP IT OPEN!** 🚀

The file is here: `C:\Users\user\Downloads\service-hub\START_HERE.bat`

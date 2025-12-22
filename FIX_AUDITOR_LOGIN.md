# URGENT: Fix Auditor Login Issue

## Problem
❌ Login fails for `auditor@crystallgroup.in` with "Invalid credentials"

## Root Cause
**The user does NOT exist in the database yet.**

## Quick Fix (Choose One Method)

### Method 1: Quick Add Script (FASTEST) ⚡

1. **Open the file:** `server/quick-add-auditor.js`

2. **Edit line 5** - Set the actual password:
   ```javascript
   password: 'CHANGE_ME',  // ⚠️ Change this to the real password
   ```

3. **Verify the email** on line 4 is correct:
   ```javascript
   email: 'auditor@crystallgroup.in',  // Is this correct?
   ```

4. **Run the script:**
   ```bash
   cd server
   node quick-add-auditor.js
   ```

5. **Done!** Try logging in again.

---

### Method 2: Interactive Add (SAFEST) 🛡️

```bash
cd server
npm run users:add
```

Then enter:
- Email: `auditor@crystallgroup.in` (or the correct email)
- Password: (your Service Hub password)
- First Name: `Auditor`
- Last Name: `Crystal Group`
- Role: `auditor`

---

### Method 3: Use Register API 🔌

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"auditor@crystallgroup.in\",\"password\":\"YOUR_PASSWORD\",\"firstName\":\"Auditor\",\"lastName\":\"Crystal Group\",\"role\":\"auditor\"}"
```

(Replace `YOUR_PASSWORD` with the actual password)

---

## Important: Verify Email Format

You mentioned two different emails:
1. `auditor.crystalgroup.in` (with dot, no @)
2. `auditor@crystallgroup.in` (with @, double "l")

**Which one is correct?** 

Check your Service Hub to confirm the exact email format!

---

## After Adding the User

### Verify User Was Created
```bash
cd server
node search-users.js
```

You should see the auditor user listed.

### Test Login
```bash
cd server  
node test-login.js
```

Or try logging in at: http://localhost:5173/login

---

## Current Database Status

✅ Users that CAN login:
- `admin@loctrack.com` (password: `password123`)
- `tech@test.com` (password: unknown)

❌ Users that CANNOT login:
- `auditor@crystallgroup.in` - **NOT IN DATABASE**
- `auditor.crystalgroup.in` - **NOT IN DATABASE**

---

## Troubleshooting

### "User already exists" error
If you get this error, the user was already added. Try logging in with the password you just set.

### Still getting "Invalid credentials"
1. Check the email spelling (@ vs ., single "l" vs double "l")
2. Verify the password is correct
3. Run `node search-users.js` to see all users
4. Check server logs for detailed error messages

### Server keeps restarting
This is normal - nodemon auto-restarts when files change. Wait for:
```
✅ Server running on port 3000
📦 Database connected
```

---

## Quick Reference Commands

```bash
# List all users
npm run users:list

# Add a user interactively
npm run users:add

# Search for specific users
node search-users.js

# Test login credentials
node test-login.js

# Quick add auditor (after editing the file)
node quick-add-auditor.js
```

---

## Next Steps

1. ✅ Confirm the correct email format
2. ✅ Choose a method above and add the user
3. ✅ Verify the user was created
4. ✅ Try logging in again

**The login will work once the user is added to the database!**

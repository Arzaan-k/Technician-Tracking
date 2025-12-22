# How to Add Service Hub Users to Tracking App

## Problem
Login fails with "Invalid credentials" for `auditor.crystalgroup.in` because this user doesn't exist in the database yet.

## Solution

### Option 1: Add User via Script (Recommended)

Run the interactive script:
```bash
cd server
node add-service-hub-user.js
```

Then enter:
- Email: `auditor.crystalgroup.in`
- Password: (your actual Service Hub password)
- First Name: `Auditor`
- Last Name: `Crystal Group`
- Phone: (optional)
- Role: `auditor`

### Option 2: Add User via API

Use the register endpoint:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "auditor.crystalgroup.in",
    "password": "YOUR_PASSWORD",
    "firstName": "Auditor",
    "lastName": "Crystal Group",
    "role": "auditor"
  }'
```

### Option 3: Add User Directly in Database

If you have database access, run this SQL:
```sql
INSERT INTO employees (email, password_hash, first_name, last_name, role, is_active)
VALUES (
  'auditor.crystalgroup.in',
  crypt('YOUR_PASSWORD', gen_salt('bf')),  -- bcrypt hash
  'Auditor',
  'Crystal Group',
  'auditor',
  true
);
```

## Quick Fix Script

I've created `add-auditor.js` for you. Edit it to set the correct password:

1. Open `server/add-auditor.js`
2. Change line 9: `const password = 'YOUR_ACTUAL_PASSWORD_HERE';`
3. Set the actual password from Service Hub
4. Run: `node add-auditor.js`

## Verify User Was Added

After adding the user, verify with:
```bash
node list-all-users.js
```

You should see `auditor.crystalgroup.in` in the list.

## Test Login

Test the credentials:
```bash
node test-login.js
```

Or try logging in through the browser at http://localhost:5173/login

## Important Notes

- ⚠️ **Use the SAME password as Service Hub** - The tracking app shares the same database
- ✅ Once added, the user can login with their Service Hub credentials
- 🔐 Passwords are hashed with bcrypt for security
- 👥 All Service Hub users need to be added to the `employees` table to login

## Current Users in Database

Run this to see who can currently login:
```bash
node list-all-users.js
```

Currently registered users:
1. `admin@loctrack.com` - Admin (test account)
2. `tech@test.com` - Technician (test account)

**Missing:** `auditor.crystalgroup.in` ❌ (needs to be added)

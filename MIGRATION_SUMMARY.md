# LocTrack Migration Summary - Using Service Hub Users Table

## Date: December 29, 2025

## Overview
Successfully migrated LocTrack to use Service Hub's `users` table directly for authentication and tracking, eliminating the need for a separate `employees` table and user synchronization.

## Changes Made

### 1. Database Schema Migration
**File:** `server/migrate-to-users-table.js`

- Dropped foreign key constraints from `location_logs` and `tracking_sessions`
- Converted `employee_id` columns from UUID to VARCHAR to match Service Hub's `users.id` type
- Renamed `employee_id` to `user_id` in both tables
- Added foreign keys referencing `users(id)` from Service Hub
- Removed the `employees` table entirely
- Cleaned up 1,549 orphaned location logs and 28 orphaned tracking sessions

### 2. Authentication Middleware Updates
**File:** `server/middleware/auth.js`

- Removed dependency on `technicians` table lookup
- Now authenticates directly against Service Hub's `users` table
- Added role-based access control at authentication level
- Only allows these roles to access LocTrack:
  - `technician`
  - `senior_technician`
  - `admin`
  - `super_admin`
  - `coordinator`
- Uses `user.id` directly for all tracking operations

### 3. Authentication Routes
**File:** `server/routes/auth.js`

Already configured correctly to:
- Query Service Hub's `users` table for login
- Validate user roles before allowing access
- Check for active accounts and valid passwords
- Generate JWT tokens with user information

### 4. Location Tracking Routes Updates
**File:** `server/routes/location.js`

Updated all queries to use `user_id` instead of `employee_id`:
- `/api/location/start` - Start tracking session
- `/api/location/update` - Update location logs
- `/api/location/stop` - Stop tracking session
- `/api/location/history` - Get location history
- `/api/location/session` - Get current session
- `/api/location/sessions` - Get session history
- `/api/location/session/:id` - Get specific session details

### 5. Admin Routes Updates
**File:** `server/routes/admin.js`

Rewrote queries to work directly with Service Hub's `users` table:
- `/api/admin/technicians` - List all technicians from users table
- `/api/admin/live-map` - Show live locations using user_id
- `/api/admin/technician/:id/history` - Get user's location history
- `/api/admin/stats` - Dashboard statistics using users table

## Benefits

1. **Real-time Authentication**: Users from Service Hub can login immediately without synchronization
2. **Single Source of Truth**: All user data comes from Service Hub's unified users table
3. **Simplified Architecture**: No need to maintain duplicate employee records
4. **Automatic Updates**: User changes in Service Hub are instantly reflected in LocTrack
5. **Role-Based Access**: Proper access control based on Service Hub roles

## Database Schema After Migration

### location_logs
- `user_id` (VARCHAR) → references `users(id)`
- Foreign key: `location_logs_user_id_fkey`

### tracking_sessions
- `user_id` (VARCHAR) → references `users(id)`
- Foreign key: `tracking_sessions_user_id_fkey`

### employees table
- ❌ **REMOVED** - No longer needed

## Access Control

### Allowed Roles for LocTrack Mobile App:
- ✅ `technician` - Can track their own location
- ✅ `senior_technician` - Can track their own location
- ✅ `admin` - Full access to tracking and admin features
- ✅ `super_admin` - Full access to tracking and admin features
- ✅ `coordinator` - Full access to tracking and admin features

### Denied Roles:
- ❌ Other roles (e.g., `customer`, `viewer`) cannot access LocTrack

## Testing Checklist

- [x] Database migration completed successfully
- [x] Auth middleware updated to use users table
- [x] Location routes updated to use user_id
- [x] Admin routes updated to use users table
- [ ] Test login with technician account
- [ ] Test location tracking start/stop
- [ ] Test location updates
- [ ] Test admin dashboard and live map
- [ ] Verify role-based access control

## Rollback Plan

If needed, the migration can be reversed by:
1. Restoring the `employees` table from backup
2. Converting `user_id` back to `employee_id` with UUID type
3. Restoring foreign key constraints to employees table
4. Reverting code changes using git

However, this should not be necessary as the new architecture is simpler and more maintainable.

## Notes

- All existing tracking sessions and location logs remain intact (only orphaned records were removed)
- JWT tokens continue to use `employeeId` field name for backward compatibility
- The codebase uses `req.user.employeeId` which now contains the Service Hub `user.id`
- No changes required to the mobile app or frontend


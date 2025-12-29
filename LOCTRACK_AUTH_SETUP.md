# LocTrack Authentication Setup - Service Hub Integration

## ✅ Migration Complete

The Location Tracking App (LocTrack) now uses Service Hub's `users` table directly for authentication and tracking. No separate employee table or user synchronization is needed.

## 🔑 How It Works

### 1. Authentication Flow

1. User opens LocTrack mobile app
2. Enters email and password
3. System checks Service Hub's `users` table
4. Validates:
   - User exists
   - Account is active (`is_active = true`)
   - Password matches
   - User has an allowed role
5. Generates JWT token with user information
6. User can now track their location

### 2. Role-Based Access Control

#### ✅ Allowed Roles (Can Login to LocTrack):
- **technician** - Can track their own location
- **senior_technician** - Can track their own location
- **admin** - Full access to tracking and admin dashboard
- **super_admin** - Full access to tracking and admin dashboard
- **coordinator** - Full access to tracking and admin dashboard

#### ❌ Denied Roles:
- **customer** - Cannot access LocTrack
- **viewer** - Cannot access LocTrack
- Any other roles - Cannot access LocTrack

### 3. Admin Access

Users with admin, super_admin, or coordinator roles get:
- Their own location tracking
- Admin dashboard access
- Live map of all technicians
- Location history reports
- System statistics

### 4. Technician Access

Users with technician or senior_technician roles get:
- Their own location tracking
- Start/stop tracking sessions
- View their location history
- No admin dashboard access

## 📱 Using the App

### For Technicians:

1. **Login**
   - Open LocTrack mobile app
   - Enter your Service Hub email and password
   - Tap "Login"

2. **Start Tracking**
   - Tap "Start Tracking" button
   - App will record your location automatically
   - You'll see your current location on the map

3. **Stop Tracking**
   - Tap "Stop Tracking" when done
   - View your session summary (distance, duration, locations)

### For Admins:

1. **Login**
   - Same as technicians
   - You get additional admin features

2. **Admin Dashboard**
   - View live map of all active technicians
   - See real-time locations
   - Check technician status (online/idle/offline)
   - View statistics

3. **Reports**
   - Access location history for any technician
   - Filter by date
   - Export data for analysis

## 🔧 Technical Details

### Database Tables

#### users (Service Hub)
- Source of truth for all authentication
- Contains: id, email, name, role, password, is_active
- LocTrack reads from this table directly

#### tracking_sessions (LocTrack)
```sql
- session_id (UUID, Primary Key)
- user_id (VARCHAR, Foreign Key → users.id)
- start_time (TIMESTAMP)
- end_time (TIMESTAMP)
- status (VARCHAR: 'active', 'completed')
- total_distance (FLOAT)
- total_locations (INTEGER)
```

#### location_logs (LocTrack)
```sql
- id (UUID, Primary Key)
- user_id (VARCHAR, Foreign Key → users.id)
- latitude (DECIMAL)
- longitude (DECIMAL)
- accuracy (FLOAT)
- speed (FLOAT)
- timestamp (TIMESTAMP)
- battery_level (INTEGER)
- network_status (VARCHAR)
```

### API Endpoints

#### Public Endpoints:
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/verify` - Verify JWT token

#### Protected Endpoints (Requires Auth):
- `POST /api/location/start` - Start tracking session
- `POST /api/location/update` - Update location data
- `POST /api/location/stop` - Stop tracking session
- `GET /api/location/history` - Get own location history
- `GET /api/location/session` - Get current session status
- `GET /api/location/sessions` - Get session history

#### Admin Endpoints (Requires Admin Role):
- `GET /api/admin/technicians` - List all technicians
- `GET /api/admin/live-map` - Live technician locations
- `GET /api/admin/technician/:id/history` - Technician history
- `GET /api/admin/stats` - Dashboard statistics

## 🚀 Deployment Notes

### Server Restart
If the backend server is running, it should automatically reload with the new changes. If not, restart it:

```bash
# If using PM2
pm2 restart location-tracking

# If using npm
npm run start

# If using node directly
node server/index.js
```

### Environment Variables Required
```env
# Database connection to Service Hub
DATABASE_URL=postgresql://user:password@host:port/database
DB_HOST=your_host
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=service_hub_db

# JWT Secret
JWT_SECRET=your_secret_key_here

# Server Port
PORT=3000
```

## ✅ Testing Checklist

All tests passed successfully:
- ✅ Database migration completed
- ✅ Foreign key constraints verified
- ✅ Can create tracking sessions with user_id
- ✅ Can log location data
- ✅ Auth middleware uses users table
- ✅ Location routes use user_id
- ✅ Admin routes use users table
- ✅ Role-based access control enforced

## 📝 What Changed

### Before:
- LocTrack had separate `employees` table
- Had to sync users from Service Hub
- Used UUID for employee_id
- Could have stale user data

### After:
- LocTrack uses Service Hub's `users` table directly
- No synchronization needed
- Uses VARCHAR for user_id (matches Service Hub)
- Always has current user data
- Real-time authentication

## 🎯 Benefits

1. **No Data Duplication** - Single source of truth
2. **Real-Time Updates** - User changes in Service Hub instantly reflected
3. **Simplified Maintenance** - No sync scripts to manage
4. **Better Security** - Immediate account deactivation works
5. **Role Consistency** - Roles managed centrally in Service Hub

## 📞 Support

If you encounter any issues:

1. Verify user has correct role in Service Hub
2. Check user account is active
3. Ensure password is set in Service Hub
4. Check server logs for detailed error messages
5. Verify database connection is working

## 🔐 Security Notes

- Passwords are bcrypt hashed in Service Hub
- JWT tokens expire after 24 hours
- Only active users can login
- Role validation happens at authentication time
- All API endpoints require valid JWT token
- Admin endpoints require admin role verification

---

**Status**: ✅ Production Ready
**Last Updated**: December 29, 2025
**Migration**: Completed Successfully


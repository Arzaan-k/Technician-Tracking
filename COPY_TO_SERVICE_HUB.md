# COPY THIS FILE TO SERVICE HUB

## Instructions:

1. Copy the file `SERVICE_HUB_auth.js` to:
   `c:\Users\user\Downloads\service-hub\server\routes\auth.js`

2. Then run these commands in PowerShell:

```powershell
# Navigate to Service Hub
cd c:\Users\user\Downloads\service-hub\server

# Copy the auth routes file
Copy-Item "c:\Users\user\Downloads\Technician-Tracking\SERVICE_HUB_auth.js" "routes\auth.js"

# Create routes directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "routes"

# Copy the file
Copy-Item "c:\Users\user\Downloads\Technician-Tracking\SERVICE_HUB_auth.js" "routes\auth.js"
```

## Or manually:

1. Open `c:\Users\user\Downloads\Technician-Tracking\SERVICE_HUB_auth.js`
2. Copy all the code
3. Create file: `c:\Users\user\Downloads\service-hub\server\routes\auth.js`
4. Paste the code
5. Save the file

## Next: Update Service Hub main server file

Add these lines to `c:\Users\user\Downloads\service-hub\server\index.js` (or `app.js` or `server.js`):

```javascript
import authRoutes from './routes/auth.js';

// After other middleware, before other routes
app.use('/auth', authRoutes);
```

## Next: Update Service Hub .env

Add to `c:\Users\user\Downloads\service-hub\server\.env`:

```env
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
PORT=5000
```

## Test it works:

```bash
# Start Service Hub
cd c:\Users\user\Downloads\service-hub\server
npm run dev

# Test login
curl -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"tech@test.com\",\"password\":\"password123\"}"
```

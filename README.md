# Technician Tracking PWA

A Progressive Web App for real-time field technician GPS tracking, integrated with Service Hub authentication.

## Features

- **Unified Authentication**: Uses existing Service Hub technician accounts
- **Real-time GPS Tracking**: Start/stop tracking sessions with location history
- **Session-based Tracking**: Only tracks when explicitly enabled
- **Offline Support**: PWA architecture for reliability
- **Battery & Network Status**: Monitors device status during tracking
- **Admin Dashboard**: Live fleet view for administrators

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Leaflet Maps
- **Backend**: Node.js, Express 5, JWT Authentication
- **Database**: PostgreSQL (Neon) - shared with Service Hub

## Quick Start

### Prerequisites
- Node.js v18+
- Access to the shared PostgreSQL database

### Single Command Start

```bash
# Install all dependencies (root + server)
npm install
cd server && npm install && cd ..

# Start both frontend and backend
npm run dev
```

This starts:
- **Backend API**: `http://localhost:3000`
- **Frontend App**: `http://localhost:5173`

### Alternative: Separate Processes

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev:client
```

## Environment Setup

### Backend (`server/.env`)

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
JWT_SECRET=your-secret-key
PORT=3000
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

## Database Schema

The app uses these tables (auto-created via `npm run db:init`):

- `employees` - Shared with Service Hub (technician accounts)
- `location_logs` - GPS coordinate history
- `tracking_sessions` - Start/stop session records

## Authentication

### Unified Login

Technicians log in using their **existing Service Hub credentials**:
- Same email/phone and password
- Disabled accounts (`is_active = false`) are blocked
- JWT tokens expire after 24 hours

### Login API

```
POST /api/auth/login
{
  "email": "tech@company.com",
  "password": "password123"
}
```

## Tracking API

### Start Tracking Session
```
POST /api/location/start
Authorization: Bearer <token>
```

### Send Location Updates (Batch)
```
POST /api/location/update
Authorization: Bearer <token>
{
  "locations": [
    {
      "latitude": 19.076,
      "longitude": 72.877,
      "accuracy": 10,
      "speed": 5.2,
      "heading": 180,
      "timestamp": 1703257200000,
      "batteryLevel": 85
    }
  ]
}
```

### Stop Tracking Session
```
POST /api/location/stop
Authorization: Bearer <token>
{
  "distance": 12.5
}
```

### Get Location History
```
GET /api/location/history?limit=50
Authorization: Bearer <token>
```

## Usage Guide

1. **Login** with Service Hub credentials
2. **Dashboard** shows your current location on the map
3. Press **Play** to start tracking
4. Location syncs every **30 seconds** automatically
5. Press **Pause** to stop tracking
6. View **History** for past location logs

## PWA Installation

1. Open the app in Chrome/Safari
2. Click "Add to Home Screen" or install prompt
3. App works offline and syncs when connected

## Admin Features

Administrators can view all technicians on a live map:

```
GET /api/admin/live-map
Authorization: Bearer <admin-token>
```

## Troubleshooting

### "Account is disabled" error
- Check `is_active` status in the `employees` table
- Contact Service Hub admin to enable the account

### Location not updating
- Ensure GPS permissions are granted
- Check if tracking is actually started (green indicator)
- Verify network connectivity

### Token expired
- Re-login to get a fresh token
- Tokens last 24 hours

## Project Structure

```
├── src/                    # Frontend React app
│   ├── components/         # Reusable components
│   ├── contexts/           # Auth context
│   ├── hooks/              # Custom hooks (geolocation)
│   ├── pages/              # Page components
│   └── lib/                # API client, utilities
├── server/                 # Backend Express API
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   └── db.js               # Database connection
└── package.json            # Root config with combined scripts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend & backend |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build frontend for production |
| `npm run db:init` | Initialize database tables |

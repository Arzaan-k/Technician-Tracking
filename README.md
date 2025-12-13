
# Employee Location Tracking PWA

A Progressive Web App for real-time field technician tracking.

## Features
- Periodical GPS Tracking (Foreground/Background via Web API).
- Offline-first architecture (PWA).
- Secure Authentication (JWT).
- Real-time Dashboard.
- PostgreSQL Database (Neon) Integration.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Shadcn UI (Concepts).
- **Backend**: Node.js, Express, PostgreSQL (pg).
- **Database**: Neon (Serverless Postgres).

## Setup & Run

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (configured in `.env`)

### 1. Backend Setup
The backend handles authentication and database sync.
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:3000`.

### 2. Frontend Setup
The frontend is the PWA interface.
```bash
# In the root project directory
npm install
npm run dev
```
App runs on `http://localhost:5173`.

### 3. Database
The app uses Neon DB. The schema is initialized automatically via `server/init-db.js` (run manually if needed: `node server/init-db.js`).

### Default Credentials
- **Email**: `admin@loctrack.com`
- **Password**: `password123`

## Usage
1. Login with the default credentials.
2. Go to the **Dashboard**.
3. Click the **Play** button to start tracking.
4. The app will sync your location every 30 seconds to the database.
5. Check your `History` (feature in progress) to see logs.

## PWA Installation
Open the app in Chrome/Safari on mobile and select "Add to Home Screen" to install it as a standalone app.

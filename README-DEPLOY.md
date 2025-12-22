# Render Deployment Guide

This guide will help you deploy the LocTrack application to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. A PostgreSQL database (you can use Render's PostgreSQL or Neon)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push your code to a Git repository** (GitHub, GitLab, or Bitbucket)

2. **Connect your repository to Render:**
   - Go to Render Dashboard
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will automatically detect `render.yaml` and create the services

3. **Set Environment Variables:**

   **For Backend Service (`loctrack-backend`):**
   - `JWT_SECRET`: Generate a strong random string (e.g., use `openssl rand -hex 32`)
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `FRONTEND_URL`: Set this to your frontend URL after deployment (e.g., `https://loctrack-frontend.onrender.com`)
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render sets this automatically)

   **For Frontend Service (`loctrack-frontend`):**
   - `VITE_API_URL`: Set this to your backend URL (e.g., `https://loctrack-backend.onrender.com/api`)

4. **Initialize Database:**
   - SSH into your backend service or use Render Shell
   - Run: `cd server && node init-db.js`
   - This creates the admin user: `admin@loctrack.com` / `password123`

### Option 2: Manual Deployment

#### Backend Service

1. Create a new **Web Service** in Render
2. Connect your repository
3. Configure:
   - **Name**: `loctrack-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free (or choose a paid plan)

4. Set environment variables (same as above)

#### Frontend Service

1. Create a new **Static Site** in Render
2. Connect your repository
3. Configure:
   - **Name**: `loctrack-frontend`
   - **Build Command**: `npm install && npm run build:client`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: Your backend URL

## Environment Variables Reference

### Backend (.env)
```env
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here
DATABASE_URL=postgresql://user:password@host:port/database
FRONTEND_URL=https://loctrack-frontend.onrender.com
```

### Frontend (Build-time)
```env
VITE_API_URL=https://loctrack-backend.onrender.com/api
```

## Post-Deployment

1. **Update CORS:** After both services are deployed, update the backend's `FRONTEND_URL` environment variable with the actual frontend URL.

2. **Initialize Database:** Run the database initialization script to create the admin user.

3. **Test Login:** Use the default credentials:
   - Email: `admin@loctrack.com`
   - Password: `password123`

## Troubleshooting

### Backend won't start
- Check that all environment variables are set
- Verify `JWT_SECRET` and `DATABASE_URL` are correct
- Check Render logs for specific errors

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly (must include `/api` at the end)
- Check that backend CORS allows your frontend URL
- Ensure backend service is running and healthy

### Database connection issues
- Verify `DATABASE_URL` is correct
- Check if database allows connections from Render's IPs
- Ensure SSL is enabled if required

## Local Testing

Before deploying, test the production build locally:

```bash
# Build frontend
npm run build:client

# Start backend in production mode
cd server
NODE_ENV=production npm start
```

## Notes

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to a paid plan for always-on services
- Database initialization only needs to run once


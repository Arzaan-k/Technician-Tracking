# Render Deployment Checklist

## Pre-Deployment

- [ ] Code is pushed to Git repository (GitHub/GitLab/Bitbucket)
- [ ] All environment variables documented
- [ ] Database is set up and accessible
- [ ] Local build tested successfully

## Environment Variables Setup

### Backend Service (`loctrack-backend`)

Set these in Render Dashboard → Your Service → Environment:

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000` (or let Render set it automatically)
- [ ] `JWT_SECRET` = [Generate with: `openssl rand -hex 32`]
- [ ] `DATABASE_URL` = [Your PostgreSQL connection string]
- [ ] `FRONTEND_URL` = [Set after frontend deploys, e.g., `https://loctrack-frontend.onrender.com`]

### Frontend Service (`loctrack-frontend`)

Set these in Render Dashboard → Your Service → Environment:

- [ ] `VITE_API_URL` = [Your backend URL, e.g., `https://loctrack-backend.onrender.com/api`]

## Deployment Steps

1. [ ] Connect repository to Render
2. [ ] Create services using `render.yaml` blueprint OR create manually
3. [ ] Set all environment variables
4. [ ] Deploy backend service first
5. [ ] Deploy frontend service
6. [ ] Update backend `FRONTEND_URL` with actual frontend URL
7. [ ] Initialize database (run `cd server && node init-db.js`)

## Post-Deployment

- [ ] Test backend health endpoint: `https://your-backend.onrender.com/health`
- [ ] Test API endpoint: `https://your-backend.onrender.com/api/auth/verify`
- [ ] Test frontend loads correctly
- [ ] Test login with default credentials:
  - Email: `admin@loctrack.com`
  - Password: `password123`
- [ ] Verify CORS is working (no CORS errors in browser console)
- [ ] Test location tracking functionality

## Troubleshooting

If deployment fails:

1. Check Render build logs
2. Verify all environment variables are set
3. Check database connection
4. Verify build commands are correct
5. Check service logs for runtime errors

## Quick Commands

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Test backend locally in production mode
cd server
NODE_ENV=production npm start

# Build frontend locally
npm run build:client

# Initialize database (run once)
cd server
node init-db.js
```


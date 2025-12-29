
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import locationRoutes from './routes/location.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

// Check for required environment variables
if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET environment variable is not set!');
    console.error('Please create a .env file in the server directory with JWT_SECRET=<your-secret-key>');
    process.exit(1);
}

// Support both DATABASE_URL and individual DB settings
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.error('ERROR: DATABASE_URL or DB_HOST environment variable is not set!');
    console.error('Please create a .env file in the server directory with database configuration');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
// In production with same-origin deployment, CORS is not needed
// In development, allow localhost
const corsOptions = {
    origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
        : process.env.NODE_ENV === 'production'
            ? true  // In production, allow same origin (frontend and backend on same domain)
            : '*',  // In development, allow all
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// API Routes - these must come BEFORE static file serving
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoints (for Render and general API health)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// For mobile app backend, we don't serve frontend files
// Return API info for root and 404 for unknown routes
app.get('/', (req, res) => {
    res.json({
        name: 'LocTrack API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth/*',
            location: '/api/location/*'
        }
    });
});

// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

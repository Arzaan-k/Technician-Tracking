import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Support both DATABASE_URL (for platforms like Render, Heroku) and individual settings (for Docker/K8s)
let poolConfig;

if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if provided (e.g., from Render, Heroku)
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
        } : false,
    };
} else {
    // Use individual DB settings (e.g., from Docker, K8s)
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'location_tracking',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: false
        } : false,
    };
}

const pool = new Pool({
    ...poolConfig,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
});

// Log connection status
pool.on('connect', () => {
    console.log('📦 Database connected');
});

pool.on('error', (err) => {
    console.error('Database pool error:', err.message);
    // Don't exit - let the app handle reconnection
});

// Test connection on startup
pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database connection verified'))
    .catch(err => console.error('⚠️ Database connection test failed:', err.message));

export default pool;

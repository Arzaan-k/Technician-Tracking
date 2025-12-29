import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use the SAME database as Service Hub for unified authentication
// This ensures any technician who can login to Service Hub can also login here
const SERVICE_HUB_DB = 'postgresql://neondb_owner:npg_ls7YTgzeoNA4@ep-young-grass-aewvokzj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || SERVICE_HUB_DB,
    ssl: {
        rejectUnauthorized: false
    },
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

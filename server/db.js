
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

console.log('Connecting to DB with URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true, // simplified ssl config for Neon
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;

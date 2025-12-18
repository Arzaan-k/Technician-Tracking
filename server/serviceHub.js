
import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_ls7YTgzeoNA4@ep-young-grass-aewvokzj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Create a new pool for the Service Hub
const serviceHubPool = new pg.Pool({
    connectionString,
    ssl: true,
    connectionTimeoutMillis: 5000,
});

serviceHubPool.on('error', (err) => {
    console.error('Unexpected error on Service Hub client', err);
});

export default serviceHubPool;

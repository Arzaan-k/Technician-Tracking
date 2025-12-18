import pg from 'pg';
const { Pool } = pg;

const connectionString = 'postgresql://neondb_owner:npg_ls7YTgzeoNA4@ep-young-grass-aewvokzj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString,
    ssl: true,
});

async function inspect() {
    try {
        console.log('Connecting to Service Hub DB...');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables found:', res.rows.map(r => r.table_name));

        // Check if employees table exists to see if we can link employee_id
        const users = await pool.query(`SELECT count(*) FROM information_schema.tables WHERE table_name = 'users' OR table_name = 'employees'`);
        console.log('User tables count:', users.rows[0].count);

    } catch (e) {
        console.error('Error connecting:', e);
    } finally {
        await pool.end();
    }
}

inspect();

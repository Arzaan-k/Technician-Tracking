
import pool from './db.js';
import serviceHubPool from './serviceHub.js';
import dotenv from 'dotenv';
dotenv.config();

function mask(str) {
    if (!str) return 'undefined';
    return str.replace(/:[^:@]+@/, ':****@');
}

async function debug() {
    try {
        console.log('--- DEBUGGING CONNECTIONS ---');
        console.log('Environment DATABASE_URL:', mask(process.env.DATABASE_URL));

        // Pool 1: Current App DB
        console.log('\n[POOL 1] Checking Tracking App DB...');
        const res1 = await pool.query('SELECT current_database(), current_schema()');
        console.log('Connected to:', res1.rows[0]);
        const count1 = await pool.query('SELECT COUNT(*) FROM employees');
        console.log('Row count in `employees`:', count1.rows[0].count);

        // Pool 2: Service Hub DB
        console.log('\n[POOL 2] Checking Service Hub DB...');
        const res2 = await serviceHubPool.query('SELECT current_database(), current_schema()');
        console.log('Connected to:', res2.rows[0]);
        const count2 = await serviceHubPool.query('SELECT COUNT(*) FROM employees');
        console.log('Row count in `employees`:', count2.rows[0].count);

        // List all tables with row counts in Pool 2
        console.log('\n[POOL 2] Tables and Row Counts:');
        const tables = await serviceHubPool.query(`
            SELECT schemaname, relname, n_live_tup 
            FROM pg_stat_user_tables 
            ORDER BY n_live_tup DESC
        `);
        tables.rows.forEach(r => {
            console.log(`  - ${r.schemaname}.${r.relname}: ~${r.n_live_tup} rows`);
        });

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
        await serviceHubPool.end();
    }
}

debug();

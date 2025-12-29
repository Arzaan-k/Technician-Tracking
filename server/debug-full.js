
import pool from './db.js';
import serviceHubPool from './serviceHub.js';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';

async function debug() {
    try {
        let output = '';
        const log = (msg) => { console.log(msg); output += msg + '\n'; };

        log('--- DEBUGGING CONNECTIONS ---');

        // Pool 1: Current App DB
        log('\n[POOL 1] Checking Tracking App DB...');
        const res1 = await pool.query('SELECT current_database(), current_schema()');
        log(`Connected to: ${JSON.stringify(res1.rows[0])}`);

        // Pool 2: Service Hub DB
        log('\n[POOL 2] Checking Service Hub DB...');
        const res2 = await serviceHubPool.query('SELECT current_database(), current_schema()');
        log(`Connected to: ${JSON.stringify(res2.rows[0])}`);

        // List all tables with row counts in Pool 2
        log('\n[POOL 2] TABLES SCAN:');
        const tables = await serviceHubPool.query(`
            SELECT schemaname, relname, n_live_tup 
            FROM pg_stat_user_tables 
            ORDER BY n_live_tup DESC
        `);

        if (tables.rows.length === 0) {
            log('  No tables found!');
        } else {
            tables.rows.forEach(r => {
                log(`  - ${r.schemaname}.${r.relname}: ~${r.n_live_tup} rows`);
            });
        }

        fs.writeFileSync('debug_result.txt', output);
        console.log('Output written to debug_result.txt');

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
        await serviceHubPool.end();
    }
}

debug();

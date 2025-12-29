
import pool from './db.js';

async function inspectTables() {
    try {
        console.log('--- Inspecting USERS and TECHNICIANS Schema ---');

        const tables = ['users', 'technicians'];

        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            res.rows.forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });

            // Sample data
            const sample = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
            if (sample.rows.length > 0) {
                console.log('  Sample Row Keys:', Object.keys(sample.rows[0]).join(', '));
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

inspectTables();

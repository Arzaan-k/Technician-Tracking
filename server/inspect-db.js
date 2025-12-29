
import pool from './db.js';

async function checkDb() {
    try {
        console.log('--- Database Inspection ---');

        // List tables
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables found:', tables.rows.map(r => r.table_name).join(', '));

        // Count employees
        const count = await pool.query('SELECT COUNT(*) FROM employees');
        console.log('Total rows in employees table:', count.rows[0].count);

        // Check if there is a 'technicians' table
        if (tables.rows.some(r => r.table_name === 'technicians')) {
            const techCount = await pool.query('SELECT COUNT(*) FROM technicians');
            console.log('Total rows in technicians table:', techCount.rows[0].count);
        }

        // Check columns in employees to see if we are missing anything
        const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'");
        console.log('Columns in employees:', columns.rows.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkDb();

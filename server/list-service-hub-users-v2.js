
import pool from './db.js';
import fs from 'fs';

async function listUsers() {
    let output = '';
    const log = (msg) => { console.log(msg); output += msg + '\n'; };

    try {
        log('--- LISTING SERVICE HUB USERS ---');

        const res = await pool.query(`
            SELECT id, email, name, role, is_active, password 
            FROM users 
            WHERE role = 'technician' OR role = 'admin'
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        log(`Found ${res.rows.length} users (showing top 20):\n`);

        res.rows.forEach(u => {
            log(`ID: ${u.id}`);
            log(`Email: ${u.email}`);
            log(`Name: ${u.name}`);
            log(`Role: ${u.role}`);
            log(`Active: ${u.is_active}`);
            log(`Password Hash (prefix): ${u.password ? u.password.substring(0, 10) + '...' : 'NULL'}`);
            log('---');
        });

        fs.writeFileSync('users_list_dump.txt', output);
        console.log('Written to users_list_dump.txt');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

listUsers();

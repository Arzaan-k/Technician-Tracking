
import pool from './db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

async function addTestUser() {
    try {
        console.log('🔧 Adding Test User to USERS table\n');

        const email = 'unified.tech@test.com';
        const password = 'Test@123';
        const name = 'Unified Test Technician';
        const role = 'technician';
        const phone = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        // Check if user exists
        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log('⚠️ User already exists, updating password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query('UPDATE users SET password = $1, is_active = true WHERE email = $2', [hashedPassword, email]);
            console.log('✅ Password updated.');
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            const id = crypto.randomUUID(); // Generate UUID since id is likely UUID/varchar

            await pool.query(
                `INSERT INTO users (id, email, password, name, role, is_active, phone_number, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())`,
                [id, email, hashedPassword, name, role, phone]
            );
            console.log('✅ User created.');
        }

        console.log('\n🎉 Credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

addTestUser();

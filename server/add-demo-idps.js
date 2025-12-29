import pool from './db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const demoUsers = [
    { email: 'user1@loctrack.com', name: 'Demo User One', role: 'technician' },
    { email: 'user2@loctrack.com', name: 'Demo User Two', role: 'technician' },
    { email: 'user3@loctrack.com', name: 'Demo User Three', role: 'technician' }
];

const PASSWORD = 'password123';

async function upsertUser({ email, name, role }) {
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
        await pool.query(
            `UPDATE users
             SET password = $1,
                 name = $2,
                 role = $3,
                 is_active = true,
                 updated_at = NOW()
             WHERE email = $4`,
            [hashedPassword, name, role, email]
        );
        console.log(`✔ Updated existing user: ${email}`);
    } else {
        const id = crypto.randomUUID();
        const phone = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        await pool.query(
            `INSERT INTO users (id, email, password, name, role, is_active, phone_number, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())`,
            [id, email, hashedPassword, name, role, phone]
        );
        console.log(`✔ Created new user: ${email}`);
    }
}

async function main() {
    try {
        console.log('🚀 Creating demo IdP users...');
        for (const user of demoUsers) {
            await upsertUser(user);
        }

        console.log('\n🔐 Credentials ready:');
        demoUsers.forEach(({ email }) => {
            console.log(`   ${email} / ${PASSWORD}`);
        });
    } catch (error) {
        console.error('❌ Failed to create demo users:', error.message);
    } finally {
        await pool.end();
    }
}

main();

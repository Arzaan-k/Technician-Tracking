import pool from './db.js';
import bcrypt from 'bcrypt';

// Add the auditor user that's trying to login
const AUDITOR_USER = {
    email: 'auditor@crystalgroup.in',  // Single "l" as shown in screenshot
    password: 'Auditor@123',  // Default password - CHANGE THIS if you know the real one
    firstName: 'Auditor',
    lastName: 'Crystal Group',
    role: 'auditor',
    phone: null
};

async function addAuditorNow() {
    try {
        console.log('🔧 Adding Auditor User for Crystal Group\n');
        console.log(`Email: ${AUDITOR_USER.email}`);
        console.log(`Name: ${AUDITOR_USER.firstName} ${AUDITOR_USER.lastName}`);
        console.log(`Role: ${AUDITOR_USER.role}`);
        console.log(`Password: ${AUDITOR_USER.password}\n`);

        // Check if exists
        const check = await pool.query(
            'SELECT email FROM employees WHERE LOWER(email) = LOWER($1)',
            [AUDITOR_USER.email]
        );

        if (check.rows.length > 0) {
            console.log('⚠️  User already exists. Updating password...');
            const hash = await bcrypt.hash(AUDITOR_USER.password, 10);
            await pool.query(
                'UPDATE employees SET password_hash = $1 WHERE LOWER(email) = LOWER($2)',
                [hash, AUDITOR_USER.email]
            );
            console.log('✅ Password updated!');
        } else {
            console.log('Creating new user...');
            const hash = await bcrypt.hash(AUDITOR_USER.password, 10);
            await pool.query(
                `INSERT INTO employees (email, phone, password_hash, first_name, last_name, role, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, true)`,
                [AUDITOR_USER.email, AUDITOR_USER.phone, hash, AUDITOR_USER.firstName, AUDITOR_USER.lastName, AUDITOR_USER.role]
            );
            console.log('✅ User created!');
        }

        console.log('\n═'.repeat(60));
        console.log('🎉 Success! You can now login with:');
        console.log(`   Email: ${AUDITOR_USER.email}`);
        console.log(`   Password: ${AUDITOR_USER.password}`);
        console.log('═'.repeat(60));
        console.log('\n📍 Login at: http://localhost:5174/login');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

addAuditorNow();

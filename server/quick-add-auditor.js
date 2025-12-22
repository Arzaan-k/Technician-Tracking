import pool from './db.js';
import bcrypt from 'bcrypt';

// ⚠️ EDIT THESE VALUES BEFORE RUNNING
const USER_TO_ADD = {
    email: 'auditor@crystallgroup.in',  // Change to exact email from Service Hub
    password: 'CHANGE_ME',  // ⚠️ SET THE ACTUAL PASSWORD HERE
    firstName: 'Auditor',
    lastName: 'Crystal Group',
    role: 'auditor',
    phone: null  // Optional
};

async function quickAddUser() {
    try {
        if (USER_TO_ADD.password === 'CHANGE_ME') {
            console.log('❌ ERROR: You must set the password first!');
            console.log('');
            console.log('📝 Edit this file: server/quick-add-auditor.js');
            console.log('   Line 5: password: "CHANGE_ME"  ← Change this');
            console.log('');
            console.log('Then run: node quick-add-auditor.js');
            process.exit(1);
        }

        console.log('🔧 Quick Add User\n');
        console.log(`Email: ${USER_TO_ADD.email}`);
        console.log(`Name: ${USER_TO_ADD.firstName} ${USER_TO_ADD.lastName}`);
        console.log(`Role: ${USER_TO_ADD.role}\n`);

        // Check if exists
        const check = await pool.query(
            'SELECT email FROM employees WHERE LOWER(email) = LOWER($1)',
            [USER_TO_ADD.email]
        );

        if (check.rows.length > 0) {
            console.log('⚠️  User already exists. Updating password...');
            const hash = await bcrypt.hash(USER_TO_ADD.password, 10);
            await pool.query(
                'UPDATE employees SET password_hash = $1 WHERE LOWER(email) = LOWER($2)',
                [hash, USER_TO_ADD.email]
            );
            console.log('✅ Password updated!');
        } else {
            console.log('Creating new user...');
            const hash = await bcrypt.hash(USER_TO_ADD.password, 10);
            await pool.query(
                `INSERT INTO employees (email, phone, password_hash, first_name, last_name, role, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, true)`,
                [USER_TO_ADD.email, USER_TO_ADD.phone, hash, USER_TO_ADD.firstName, USER_TO_ADD.lastName, USER_TO_ADD.role]
            );
            console.log('✅ User created!');
        }

        console.log('\n🎉 Success! Login with:');
        console.log(`   Email: ${USER_TO_ADD.email}`);
        console.log(`   Password: ${USER_TO_ADD.password}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

quickAddUser();

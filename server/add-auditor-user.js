import pool from './db.js';
import bcrypt from 'bcrypt';

async function addAuditorUser() {
    try {
        console.log('🔧 Adding Auditor User for Crystal Group\n');
        console.log('='.repeat(60));

        // ⚠️ UPDATE THESE VALUES WITH CORRECT INFORMATION
        const email = 'auditor@crystallgroup.in';  // Change if needed
        const password = 'Crystal@123';  // ⚠️ CHANGE THIS TO ACTUAL PASSWORD!
        const firstName = 'Auditor';
        const lastName = 'Crystal Group';
        const role = 'auditor';
        const phone = null; // Optional - add if needed

        console.log('Creating user with:');
        console.log(`  Email: ${email}`);
        console.log(`  Name: ${firstName} ${lastName}`);
        console.log(`  Role: ${role}`);
        console.log(`  Password: ${'*'.repeat(password.length)}`);
        console.log('');

        // Check if user already exists
        const existing = await pool.query(
            'SELECT email, first_name, last_name, is_active FROM employees WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (existing.rows.length > 0) {
            const user = existing.rows[0];
            console.log('⚠️  User already exists!');
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.first_name} ${user.last_name}`);
            console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
            console.log('');
            console.log('💡 To update the password, run:');
            console.log('   node update-password.js');
            await pool.end();
            return;
        }

        // Hash the password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user
        console.log('💾 Creating user in database...');
        const result = await pool.query(
            `INSERT INTO employees (email, phone, password_hash, first_name, last_name, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING employee_id, email, first_name, last_name, role`,
            [email, phone, hashedPassword, firstName, lastName, role]
        );

        console.log('\n✅ User created successfully!\n');
        console.log('='.repeat(60));
        console.log('User Details:');
        console.log(`  ID: ${result.rows[0].employee_id}`);
        console.log(`  Email: ${result.rows[0].email}`);
        console.log(`  Name: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
        console.log(`  Role: ${result.rows[0].role}`);
        console.log('='.repeat(60));

        console.log('\n🎉 Login Credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log('');
        console.log('✅ You can now login at: http://localhost:5173/login');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

console.log('⚠️  IMPORTANT: Edit this file to set the correct password before running!');
console.log('   Open: server/add-auditor-user.js');
console.log('   Line 10: const password = "Crystal@123";  // CHANGE THIS\n');

// Automatically run the function
addAuditorUser();

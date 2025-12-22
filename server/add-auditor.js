import pool from './db.js';
import bcrypt from 'bcrypt';

async function addAuditorUser() {
    try {
        console.log('🔧 Adding Service Hub Auditor User\n');

        // User details - UPDATE THESE WITH ACTUAL SERVICE HUB CREDENTIALS
        const email = 'auditor.crystalgroup.in';
        const password = 'YOUR_ACTUAL_PASSWORD_HERE'; // ⚠️ CHANGE THIS!
        const firstName = 'Auditor';
        const lastName = 'Crystal Group';
        const role = 'auditor';
        const phone = null; // Optional

        console.log(`📧 Email: ${email}`);
        console.log(`👤 Name: ${firstName} ${lastName}`);
        console.log(`🎭 Role: ${role}\n`);

        // Check if user already exists
        const existing = await pool.query(
            'SELECT email, first_name, last_name FROM employees WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (existing.rows.length > 0) {
            console.log('⚠️  User already exists!');
            console.log(`   Current: ${existing.rows[0].first_name} ${existing.rows[0].last_name}`);
            console.log('\n💡 To update password, modify this script and uncomment the UPDATE section below.\n');

            // Uncomment to update password:
            /*
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE employees SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = LOWER($2)',
                [hashedPassword, email]
            );
            console.log('✅ Password updated!');
            */

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
        console.log('═'.repeat(60));
        console.log('User Details:');
        console.log(`  ID: ${result.rows[0].employee_id}`);
        console.log(`  Email: ${result.rows[0].email}`);
        console.log(`  Name: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
        console.log(`  Role: ${result.rows[0].role}`);
        console.log('═'.repeat(60));

        console.log('\n🎉 You can now login with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

addAuditorUser();

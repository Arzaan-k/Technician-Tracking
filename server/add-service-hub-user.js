import pool from './db.js';
import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function addServiceHubUser() {
    try {
        console.log('🔧 Add Service Hub User to Tracking App\n');
        console.log('This will create a user account that can login to the tracking app.');
        console.log('Use the SAME credentials as in Service Hub.\n');

        // Get user input
        const email = await question('Email (e.g., auditor.crystalgroup.in): ');
        const password = await question('Password: ');
        const firstName = await question('First Name: ');
        const lastName = await question('Last Name: ');
        const phone = await question('Phone (optional, press Enter to skip): ');
        const role = await question('Role (technician/admin/auditor) [default: technician]: ') || 'technician';

        console.log('\n📝 Creating user...');

        // Check if user already exists
        const existing = await pool.query(
            'SELECT email FROM employees WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (existing.rows.length > 0) {
            console.log('⚠️  User with this email already exists!');
            const update = await question('\nDo you want to update the password? (yes/no): ');

            if (update.toLowerCase() === 'yes' || update.toLowerCase() === 'y') {
                const hashedPassword = await bcrypt.hash(password, 10);
                await pool.query(
                    'UPDATE employees SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = LOWER($2)',
                    [hashedPassword, email]
                );
                console.log('✅ Password updated successfully!');
            } else {
                console.log('❌ Operation cancelled.');
            }
            rl.close();
            await pool.end();
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user
        const result = await pool.query(
            `INSERT INTO employees (email, phone, password_hash, first_name, last_name, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING employee_id, email, first_name, last_name, role`,
            [email, phone || null, hashedPassword, firstName, lastName, role]
        );

        console.log('\n✅ User created successfully!\n');
        console.log('User Details:');
        console.log(`  Email: ${result.rows[0].email}`);
        console.log(`  Name: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
        console.log(`  Role: ${result.rows[0].role}`);
        console.log(`  ID: ${result.rows[0].employee_id}`);

        console.log('\n🎉 You can now login with these credentials!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

addServiceHubUser();

import serviceHubPool from './serviceHub.js';
import pool from './db.js';
import bcrypt from 'bcrypt';

async function syncFromServiceHub() {
    try {
        console.log('🔄 Syncing Users from Service Hub Database\n');
        console.log('This will check for users in Service Hub and add them to the tracking app.\n');

        // Get all users from Service Hub database
        console.log('📊 Fetching users from Service Hub...');
        const serviceHubUsers = await serviceHubPool.query(`
            SELECT 
                email, 
                phone,
                password_hash,
                first_name, 
                last_name, 
                role, 
                is_active,
                employee_code
            FROM employees
            WHERE is_active = true
        `);

        console.log(`Found ${serviceHubUsers.rows.length} active users in Service Hub\n`);

        if (serviceHubUsers.rows.length === 0) {
            console.log('⚠️  No users found in Service Hub database.');
            console.log('💡 The databases might already be the same, or Service Hub has no users yet.\n');
            await serviceHubPool.end();
            await pool.end();
            return;
        }

        // Get existing users in tracking app
        const trackingUsers = await pool.query('SELECT email FROM employees');
        const existingEmails = new Set(trackingUsers.rows.map(u => u.email.toLowerCase()));

        let added = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of serviceHubUsers.rows) {
            try {
                if (existingEmails.has(user.email.toLowerCase())) {
                    console.log(`⏭️  Skipping ${user.email} (already exists)`);
                    skipped++;
                    continue;
                }

                // Check if user has a password
                if (!user.password_hash) {
                    console.log(`⚠️  Skipping ${user.email} (no password set in Service Hub)`);
                    skipped++;
                    continue;
                }

                // Insert user into tracking app database
                await pool.query(
                    `INSERT INTO employees (
                        email, phone, password_hash, first_name, last_name, 
                        role, is_active, employee_code
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        user.email,
                        user.phone,
                        user.password_hash, // Copy the hash directly
                        user.first_name,
                        user.last_name,
                        user.role,
                        user.is_active,
                        user.employee_code
                    ]
                );

                console.log(`✅ Added ${user.email} (${user.first_name} ${user.last_name})`);
                added++;

            } catch (err) {
                console.error(`❌ Error adding ${user.email}:`, err.message);
                errors++;
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('Sync Summary:');
        console.log(`  ✅ Added: ${added}`);
        console.log(`  ⏭️  Skipped: ${skipped}`);
        console.log(`  ❌ Errors: ${errors}`);
        console.log('═'.repeat(60));

        if (added > 0) {
            console.log('\n🎉 Users synced! They can now login to the tracking app with their Service Hub credentials.');
        }

    } catch (error) {
        console.error('❌ Sync Error:', error.message);
        console.error(error);
    } finally {
        await serviceHubPool.end();
        await pool.end();
    }
}

syncFromServiceHub();

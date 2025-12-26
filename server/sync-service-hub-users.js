import serviceHubPool from './serviceHub.js';
import pool from './db.js';

async function syncFromServiceHub() {
    try {
        console.log('🔄 Syncing Users from Service Hub Database (employees table) to Unified Auth (users table)\n');

        // 1. Get all users from Service Hub 'employees' table
        console.log('📊 Fetching employees...');
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

        console.log(`Found ${serviceHubUsers.rows.length} active employees to sync.\n`);

        if (serviceHubUsers.rows.length === 0) {
            console.log('⚠️  No employees found.');
            await serviceHubPool.end();
            await pool.end();
            return;
        }

        // 2. Get existing users in 'users' table to avoid duplicates (by email)
        const existingUsersRes = await pool.query('SELECT email FROM users WHERE email IS NOT NULL');
        const existingEmails = new Set(existingUsersRes.rows.map(u => u.email.toLowerCase()));

        let added = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of serviceHubUsers.rows) {
            try {
                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                const userRole = user.role || 'technician';
                const isActive = user.is_active !== false;
                const userEmail = user.email ? user.email.toLowerCase() : null;
                const userPhone = user.phone; // Map phone -> phone_number

                if (!userEmail) {
                    console.log('Skipping user without email');
                    skipped++;
                    continue;
                }

                if (!userPhone) {
                    console.log(`Skipping ${userEmail} - No phone number (Required by schema)`);
                    skipped++;
                    continue;
                }

                if (existingEmails.has(userEmail)) {
                    // Update existing
                    if (user.password_hash) {
                        await pool.query(
                            `UPDATE users SET 
                                password = $1, 
                                name = $2, 
                                role = $3, 
                                is_active = $4,
                                phone_number = $5
                             WHERE email = $6`,
                            [
                                user.password_hash,
                                fullName,
                                userRole,
                                isActive,
                                userPhone,
                                user.email // Original email case? typically lowercased match is better but update uses precise
                            ]
                        );
                        updated++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                if (!user.password_hash) {
                    console.log(`⚠️  Skipping ${userEmail} (no password set)`);
                    skipped++;
                    continue;
                }

                // Insert into 'users' table
                await pool.query(
                    `INSERT INTO users (
                        email, password, name, role, is_active, phone_number
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        userEmail,
                        user.password_hash,
                        fullName,
                        userRole,
                        isActive,
                        userPhone
                    ]
                );

                console.log(`✅ Added ${userEmail} (${fullName})`);
                added++;

            } catch (err) {
                console.error(`❌ Error syncing ${user.email}:`, err.message);
                errors++;
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('Sync Summary:');
        console.log(`  ✅ Added: ${added}`);
        console.log(`  🔄 Updated: ${updated}`);
        console.log(`  ⏭️  Skipped: ${skipped}`);
        console.log(`  ❌ Errors: ${errors}`);
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('❌ Sync Error:', error.message);
        console.error(error);
    } finally {
        await serviceHubPool.end();
        await pool.end();
    }
}

syncFromServiceHub();

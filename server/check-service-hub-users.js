import serviceHubPool from './serviceHub.js';
import pool from './db.js';

async function checkUsers() {
    try {
        console.log('🔍 Checking Service Hub Database Users\n');

        // Check Service Hub database
        console.log('📊 Service Hub Database:');
        console.log('='.repeat(60));

        const serviceHubUsers = await serviceHubPool.query(`
            SELECT email, first_name, last_name, role, is_active, 
                   CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password
            FROM employees
            ORDER BY created_at DESC
        `);

        console.log(`Found ${serviceHubUsers.rows.length} users:\n`);

        serviceHubUsers.rows.forEach((user, idx) => {
            console.log(`${idx + 1}. ${user.email}`);
            console.log(`   Name: ${user.first_name} ${user.last_name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.is_active}`);
            console.log(`   Has Password: ${user.has_password}`);
            console.log('');
        });

        console.log('\n📊 Local Tracking App Database:');
        console.log('='.repeat(60));

        const localUsers = await pool.query(`
            SELECT email, first_name, last_name, role, is_active,
                   CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password
            FROM employees
            ORDER BY created_at DESC
        `);

        console.log(`Found ${localUsers.rows.length} users:\n`);

        localUsers.rows.forEach((user, idx) => {
            console.log(`${idx + 1}. ${user.email}`);
            console.log(`   Name: ${user.first_name} ${user.last_name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.is_active}`);
            console.log(`   Has Password: ${user.has_password}`);
            console.log('');
        });

        console.log('\n💡 Summary:');
        console.log('='.repeat(60));

        if (serviceHubUsers.rows.length === localUsers.rows.length) {
            console.log('✅ Both databases have the same number of users');
            console.log('✅ They appear to be using the SAME database');
        } else {
            console.log('⚠️  Different number of users in each database');
            console.log('⚠️  Service Hub and Tracking App may be using different databases');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await serviceHubPool.end();
        await pool.end();
    }
}

checkUsers();

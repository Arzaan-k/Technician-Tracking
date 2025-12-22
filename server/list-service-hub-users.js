import serviceHubPool from './serviceHub.js';

async function listServiceHubUsers() {
    try {
        console.log('🔍 Checking Service Hub Database Users\n');
        console.log('='.repeat(70));

        const result = await serviceHubPool.query(`
            SELECT 
                email, 
                first_name, 
                last_name, 
                role, 
                is_active,
                phone,
                CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password
            FROM employees
            WHERE is_active = true
            ORDER BY created_at DESC
        `);

        if (result.rows.length === 0) {
            console.log('⚠️  No active users found in Service Hub database!');
            console.log('\n💡 This means:');
            console.log('   1. Service Hub has no technician accounts yet, OR');
            console.log('   2. The database connection is incorrect');
            await serviceHubPool.end();
            return;
        }

        console.log(`Found ${result.rows.length} active user(s) in Service Hub:\n`);

        result.rows.forEach((user, idx) => {
            console.log(`${idx + 1}. ${user.email || user.phone || 'No email/phone'}`);
            console.log(`   Name: ${user.first_name} ${user.last_name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
            console.log(`   Has Password: ${user.has_password}`);
            console.log('');
        });

        console.log('='.repeat(70));
        console.log('\n✅ ALL these users can login to the Technician Tracking app!');
        console.log('   They use the SAME email/phone and password as Service Hub.');
        console.log('\n📍 Login at: http://localhost:5173/login');

    } catch (error) {
        console.error('❌ Error connecting to Service Hub database:', error.message);
        console.error('\n💡 Check:');
        console.error('   1. Is the Service Hub database URL correct?');
        console.error('   2. Is the database accessible?');
        console.error('   3. Does the employees table exist?');
    } finally {
        await serviceHubPool.end();
    }
}

listServiceHubUsers();

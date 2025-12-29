import pool from './db.js';

async function listAllUsers() {
    try {
        console.log('👥 All Users in Database\n');
        console.log('='.repeat(80));

        // Count of all users
        const countRes = await pool.query('SELECT COUNT(*) FROM users');
        const count = parseInt(countRes.rows[0].count);
        console.log(`Total Unified Users: ${count}\n`);

        const result = await pool.query(`
            SELECT 
                id,
                email, 
                phone_number as phone,
                name, 
                role, 
                is_active,
                CASE WHEN password IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password,
                created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 50
        `);

        if (result.rows.length === 0) {
            console.log('⚠️  No users found in database!');
            return;
        }

        console.log(`\nListing recent ${result.rows.length} user(s):\n`);

        result.rows.forEach((user, idx) => {
            console.log(`${idx + 1}. ${user.email || 'No email'}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
            console.log(`   Has Password: ${user.has_password}`);
            console.log(`   Created: ${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}`);
            console.log('');
        });

        if (count > 50) {
            console.log(`... and ${count - 50} more users.`);
        }

        console.log('='.repeat(80));
        console.log('\n💡 To test login with any of these emails, use:');
        console.log('   node test-login.js');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

listAllUsers();

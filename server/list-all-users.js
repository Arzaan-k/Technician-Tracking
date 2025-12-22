import pool from './db.js';

async function listAllUsers() {
    try {
        console.log('👥 All Users in Database\n');
        console.log('='.repeat(80));

        const result = await pool.query(`
            SELECT 
                email, 
                phone,
                first_name, 
                last_name, 
                role, 
                is_active,
                CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password,
                created_at
            FROM employees
            ORDER BY created_at DESC
        `);

        if (result.rows.length === 0) {
            console.log('⚠️  No users found in database!');
            console.log('\n💡 To create users, run: npm run db:init');
            return;
        }

        console.log(`\nFound ${result.rows.length} user(s):\n`);

        result.rows.forEach((user, idx) => {
            console.log(`${idx + 1}. ${user.email || 'No email'}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Name: ${user.first_name} ${user.last_name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
            console.log(`   Has Password: ${user.has_password}`);
            console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
            console.log('');
        });

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

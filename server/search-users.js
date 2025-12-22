import pool from './db.js';

async function searchUsers() {
    try {
        console.log('🔍 Searching for users matching "crystal" or "auditor"\n');

        const result = await pool.query(`
            SELECT 
                email, 
                first_name, 
                last_name, 
                role, 
                is_active,
                CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password
            FROM employees
            WHERE 
                LOWER(email) LIKE '%crystal%' OR 
                LOWER(email) LIKE '%auditor%' OR
                LOWER(first_name) LIKE '%auditor%' OR
                LOWER(role) LIKE '%auditor%'
            ORDER BY email
        `);

        if (result.rows.length === 0) {
            console.log('❌ No users found matching "crystal" or "auditor"\n');
            console.log('📋 All users in database:');

            const allUsers = await pool.query(`
                SELECT email, first_name, last_name, role, is_active
                FROM employees
                ORDER BY email
            `);

            allUsers.rows.forEach((user, idx) => {
                console.log(`${idx + 1}. ${user.email}`);
                console.log(`   Name: ${user.first_name} ${user.last_name}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
                console.log('');
            });

            console.log('\n💡 The auditor user needs to be added to the database.');
            console.log('   Run: npm run users:add');
        } else {
            console.log(`✅ Found ${result.rows.length} matching user(s):\n`);

            result.rows.forEach((user, idx) => {
                console.log(`${idx + 1}. ${user.email}`);
                console.log(`   Name: ${user.first_name} ${user.last_name}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
                console.log(`   Has Password: ${user.has_password}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

searchUsers();

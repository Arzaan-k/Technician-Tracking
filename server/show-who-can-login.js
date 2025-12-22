import pool from './db.js';

async function showLoginableUsers() {
    try {
        console.log('\n');
        console.log('═'.repeat(80));
        console.log('  TECHNICIAN TRACKING APP - UNIFIED AUTHENTICATION STATUS');
        console.log('═'.repeat(80));
        console.log('\n✅ Using SAME database as Service Hub');
        console.log('✅ Any Service Hub user can login to Tracking App\n');

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
            console.log('⚠️  NO USERS FOUND IN DATABASE!');
            console.log('\n💡 This means:');
            console.log('   - Service Hub has no technician accounts yet');
            console.log('   - You need to create users in Service Hub first');
            console.log('   - Once created in Service Hub, they will automatically work here\n');
            await pool.end();
            return;
        }

        console.log(`📊 Total Users in Database: ${result.rows.length}\n`);
        console.log('─'.repeat(80));

        let canLogin = 0;
        let cannotLogin = 0;

        result.rows.forEach((user, idx) => {
            const loginEmail = user.email || user.phone || 'NO EMAIL/PHONE';
            const canUserLogin = user.is_active && user.has_password === 'Yes';

            if (canUserLogin) {
                console.log(`\n✅ CAN LOGIN - User ${idx + 1}`);
                canLogin++;
            } else {
                console.log(`\n❌ CANNOT LOGIN - User ${idx + 1}`);
                cannotLogin++;
            }

            console.log(`   Email/Phone: ${loginEmail}`);
            console.log(`   Name: ${user.first_name} ${user.last_name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
            console.log(`   Has Password: ${user.has_password}`);

            if (!canUserLogin) {
                if (!user.is_active) {
                    console.log(`   ⚠️  Reason: Account is disabled`);
                }
                if (user.has_password === 'No') {
                    console.log(`   ⚠️  Reason: No password set`);
                }
            }
        });

        console.log('\n' + '─'.repeat(80));
        console.log('\n📈 SUMMARY:');
        console.log(`   ✅ Can Login: ${canLogin} user(s)`);
        console.log(`   ❌ Cannot Login: ${cannotLogin} user(s)`);
        console.log(`   📊 Total: ${result.rows.length} user(s)`);

        console.log('\n' + '═'.repeat(80));
        console.log('  HOW TO ADD MORE USERS');
        console.log('═'.repeat(80));
        console.log('\n1. Create the user in Service Hub');
        console.log('2. The user will AUTOMATICALLY be able to login to Tracking App');
        console.log('3. No additional setup needed!\n');

        console.log('🌐 Login URL: http://localhost:5173/login');
        console.log('📝 Use the SAME credentials as Service Hub\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

showLoginableUsers();

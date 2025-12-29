import pool from './db.js';
import bcrypt from 'bcrypt';

async function testLogin() {
    try {
        console.log('🔍 Testing Login Credentials...\n');

        // Test credentials
        const testEmail = 'unified.tech@test.com';
        const testPassword = 'Test@123';

        console.log(`📧 Testing with: ${testEmail}`);
        console.log(`🔑 Password: ${testPassword}\n`);

        console.log('📡 Checking database connection...');
        const dbTest = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', dbTest.rows[0].now);
        console.log('');

        // Check if users table exists
        console.log('📋 Checking users table...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        console.log('✅ Users table exists:', tableCheck.rows[0].exists);
        console.log('');

        // Try to find the test user
        console.log(`\n🔍 Looking for user: ${testEmail}`);
        const result = await pool.query(
            `SELECT id, email, phone_number, name, role, password, is_active 
             FROM users 
             WHERE LOWER(email) = LOWER($1)`,
            [testEmail]
        );

        if (result.rows.length === 0) {
            console.log('❌ User not found!');
            return;
        }

        const user = result.rows[0];
        console.log('✅ User found!');
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.is_active}`);
        console.log('');

        // Check if account is active
        if (user.is_active === false) {
            console.log('❌ Account is disabled!');
            return;
        }

        // Check if password hash exists
        if (!user.password) {
            console.log('❌ User has no password set (NULL)!');
            console.log('💡 You must set a password for this user in Service Hub or database.');
            return;
        }

        console.log('🔐 Testing password...');
        console.log(`  Stored hash: ${user.password.substring(0, 30)}...`);

        // Verify password
        const isValidPassword = await bcrypt.compare(testPassword, user.password);

        if (isValidPassword) {
            console.log('✅ PASSWORD MATCH! Login should work.');
            console.log('\n✨ Test Credentials:');
            console.log(`   Email: ${testEmail}`);
            console.log(`   Password: ${testPassword}`);
        } else {
            console.log('❌ PASSWORD MISMATCH!');
            console.log('\n🔧 Possible issues:');
            console.log('   1. Password was changed');
            console.log('   2. Hashes created with different rounds/salts');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

testLogin();

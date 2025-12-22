import pool from './db.js';
import bcrypt from 'bcrypt';

async function testLogin() {
    try {
        console.log('🔍 Testing Login Credentials...\n');
        
        // Test credentials
        const testEmail = 'admin@loctrack.com';
        const testPassword = 'password123';
        
        console.log(`📧 Testing with: ${testEmail}`);
        console.log(`🔑 Password: ${testPassword}\n`);
        
        // Check database connection
        console.log('📡 Checking database connection...');
        const dbTest = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', dbTest.rows[0].now);
        console.log('');
        
        // Check if employees table exists
        console.log('📋 Checking employees table...');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'employees'
            );
        `);
        console.log('✅ Employees table exists:', tableCheck.rows[0].exists);
        console.log('');
        
        // List all columns in employees table
        console.log('📊 Columns in employees table:');
        const columnsCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'employees'
            ORDER BY ordinal_position
        `);
        columnsCheck.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });
        console.log('');
        
        // Check for password column
        const passwordColumn = columnsCheck.rows.find(col => 
            col.column_name === 'password_hash' || 
            col.column_name === 'password' || 
            col.column_name === 'hashed_password'
        );
        
        if (!passwordColumn) {
            console.error('❌ No password column found!');
            return;
        }
        
        console.log(`✅ Password column found: ${passwordColumn.column_name}\n`);
        
        // List all users
        console.log('👥 All users in database:');
        const allUsers = await pool.query(`
            SELECT email, first_name, last_name, role, is_active, ${passwordColumn.column_name} as password_hash
            FROM employees
        `);
        
        if (allUsers.rows.length === 0) {
            console.log('⚠️  No users found in database!');
            console.log('💡 Run: npm run db:init to create default user\n');
            return;
        }
        
        allUsers.rows.forEach((user, idx) => {
            console.log(`\n  User ${idx + 1}:`);
            console.log(`    Email: ${user.email}`);
            console.log(`    Name: ${user.first_name} ${user.last_name}`);
            console.log(`    Role: ${user.role}`);
            console.log(`    Active: ${user.is_active}`);
            console.log(`    Has Password: ${user.password_hash ? 'Yes' : 'No'}`);
            if (user.password_hash) {
                console.log(`    Password Hash: ${user.password_hash.substring(0, 20)}...`);
            }
        });
        console.log('');
        
        // Try to find the test user
        console.log(`\n🔍 Looking for user: ${testEmail}`);
        const result = await pool.query(
            `SELECT employee_id, email, phone, first_name, last_name, role, ${passwordColumn.column_name} as password_hash, is_active 
             FROM employees 
             WHERE LOWER(email) = LOWER($1) OR phone = $1`,
            [testEmail]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ User not found!');
            console.log('💡 Available emails:', allUsers.rows.map(u => u.email).join(', '));
            return;
        }
        
        const employee = result.rows[0];
        console.log('✅ User found!');
        console.log(`  Email: ${employee.email}`);
        console.log(`  Name: ${employee.first_name} ${employee.last_name}`);
        console.log(`  Role: ${employee.role}`);
        console.log(`  Active: ${employee.is_active}`);
        console.log('');
        
        // Check if account is active
        if (employee.is_active === false) {
            console.log('❌ Account is disabled!');
            return;
        }
        
        // Check if password hash exists
        if (!employee.password_hash) {
            console.log('❌ User has no password hash set!');
            return;
        }
        
        console.log('🔐 Testing password...');
        console.log(`  Stored hash: ${employee.password_hash.substring(0, 30)}...`);
        
        // Verify password
        const isValidPassword = await bcrypt.compare(testPassword, employee.password_hash);
        
        if (isValidPassword) {
            console.log('✅ PASSWORD MATCH! Login should work.');
            console.log('\n✨ Test Credentials:');
            console.log(`   Email: ${testEmail}`);
            console.log(`   Password: ${testPassword}`);
        } else {
            console.log('❌ PASSWORD MISMATCH! This is the problem.');
            console.log('\n🔧 Possible issues:');
            console.log('   1. Password was changed in Service Hub');
            console.log('   2. Password hash is corrupted');
            console.log('   3. Different hashing algorithm used');
            console.log('\n💡 To fix: Re-run db:init or update password manually');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

testLogin();

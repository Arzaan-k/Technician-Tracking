import pool from './db.js';

/**
 * Migration: Use Service Hub's users table instead of employees table
 * This eliminates the need to sync users and fixes foreign key constraints
 */

async function migrateToUsersTable() {
    console.log('🔄 Starting migration to use Service Hub users table...\n');

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        console.log('1️⃣  Dropping foreign key constraints...');
        
        // Drop existing foreign key constraints
        await client.query(`
            ALTER TABLE IF EXISTS location_logs 
            DROP CONSTRAINT IF EXISTS location_logs_employee_id_fkey CASCADE;
        `);
        
        await client.query(`
            ALTER TABLE IF EXISTS tracking_sessions 
            DROP CONSTRAINT IF EXISTS tracking_sessions_employee_id_fkey CASCADE;
        `);

        console.log('✅ Foreign key constraints dropped\n');

        console.log('2️⃣  Checking users table ID type...');
        
        const usersIdType = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'id';
        `);
        
        const userIdType = usersIdType.rows[0]?.data_type;
        console.log(`   Users table ID type: ${userIdType}`);
        console.log('✅ Type check complete\n');

        console.log('3️⃣  Converting employee_id columns to match users table...');
        
        // Change employee_id type to match users.id (VARCHAR)
        await client.query(`
            ALTER TABLE location_logs 
            ALTER COLUMN employee_id TYPE VARCHAR(255) USING employee_id::text;
        `);
        
        await client.query(`
            ALTER TABLE tracking_sessions 
            ALTER COLUMN employee_id TYPE VARCHAR(255) USING employee_id::text;
        `);

        console.log('✅ Column types converted\n');

        console.log('4️⃣  Renaming employee_id columns to user_id...');
        
        // Rename columns
        await client.query(`
            ALTER TABLE location_logs 
            RENAME COLUMN employee_id TO user_id;
        `);
        
        await client.query(`
            ALTER TABLE tracking_sessions 
            RENAME COLUMN employee_id TO user_id;
        `);

        console.log('✅ Columns renamed\n');

        console.log('5️⃣  Cleaning up orphaned records...');
        
        // Delete location_logs that reference non-existent users
        const deletedLogs = await client.query(`
            DELETE FROM location_logs 
            WHERE user_id NOT IN (SELECT id FROM users);
        `);
        
        // Delete tracking_sessions that reference non-existent users
        const deletedSessions = await client.query(`
            DELETE FROM tracking_sessions 
            WHERE user_id NOT IN (SELECT id FROM users);
        `);

        console.log(`   Deleted ${deletedLogs.rowCount} orphaned location logs`);
        console.log(`   Deleted ${deletedSessions.rowCount} orphaned tracking sessions`);
        console.log('✅ Cleanup complete\n');

        console.log('6️⃣  Adding foreign key constraints to users table...');
        
        // Add foreign keys to Service Hub's users table
        await client.query(`
            ALTER TABLE location_logs 
            ADD CONSTRAINT location_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        `);
        
        await client.query(`
            ALTER TABLE tracking_sessions 
            ADD CONSTRAINT tracking_sessions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        `);

        console.log('✅ Foreign key constraints added to users table\n');

        console.log('7️⃣  Dropping employees table...');
        
        // Drop the employees table as it's no longer needed
        await client.query(`
            DROP TABLE IF EXISTS employees CASCADE;
        `);

        console.log('✅ Employees table dropped\n');

        console.log('8️⃣  Updating indexes...');
        
        // Update indexes to use new column names
        await client.query(`
            DROP INDEX IF EXISTS idx_location_employee_id;
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_location_user_id ON location_logs(user_id);
        `);

        console.log('✅ Indexes updated\n');

        await client.query('COMMIT');

        console.log('=' .repeat(60));
        console.log('✅ Migration completed successfully!');
        console.log('=' .repeat(60));
        console.log('\n📊 Summary:');
        console.log('   • Foreign keys now reference users table from Service Hub');
        console.log('   • Employees table removed');
        console.log('   • Column names updated: employee_id → user_id');
        console.log('   • All users from Service Hub can now login directly\n');

        // Show current table structure
        const logsCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'location_logs' 
            ORDER BY ordinal_position;
        `);
        
        console.log('📋 location_logs columns:');
        logsCheck.rows.forEach(col => {
            console.log(`   • ${col.column_name} (${col.data_type})`);
        });

        const sessionsCheck = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tracking_sessions' 
            ORDER BY ordinal_position;
        `);
        
        console.log('\n📋 tracking_sessions columns:');
        sessionsCheck.rows.forEach(col => {
            console.log(`   • ${col.column_name} (${col.data_type})`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateToUsersTable();


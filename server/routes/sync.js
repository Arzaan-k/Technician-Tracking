import express from 'express';
import serviceHubPool from '../serviceHub.js';
import pool from '../db.js';

const router = express.Router();

/**
 * GET /api/sync/users
 * Sync all users from Service Hub to Tracking App database
 * This ensures any technician in Service Hub can login to Tracking App
 */
router.get('/users', async (req, res) => {
    try {
        console.log('🔄 Starting user sync from Service Hub...');

        // Get all active users from Service Hub
        const serviceHubUsers = await serviceHubPool.query(`
            SELECT 
                email, 
                phone,
                password_hash,
                first_name, 
                last_name, 
                role, 
                is_active,
                employee_code,
                department,
                created_at
            FROM employees
            WHERE is_active = true AND password_hash IS NOT NULL
        `);

        console.log(`📊 Found ${serviceHubUsers.rows.length} active users in Service Hub`);

        // Get existing users in tracking app
        const trackingUsers = await pool.query('SELECT email, phone FROM employees');
        const existingEmails = new Set(trackingUsers.rows.map(u => u.email?.toLowerCase()).filter(Boolean));
        const existingPhones = new Set(trackingUsers.rows.map(u => u.phone).filter(Boolean));

        let added = 0;
        let skipped = 0;
        let errors = 0;
        const addedUsers = [];

        for (const user of serviceHubUsers.rows) {
            try {
                // Check if user already exists by email or phone
                const emailExists = user.email && existingEmails.has(user.email.toLowerCase());
                const phoneExists = user.phone && existingPhones.has(user.phone);

                if (emailExists || phoneExists) {
                    console.log(`⏭️  Skipping ${user.email || user.phone} (already exists)`);
                    skipped++;
                    continue;
                }

                // Insert user into tracking app database
                await pool.query(
                    `INSERT INTO employees (
                        email, phone, password_hash, first_name, last_name, 
                        role, is_active, employee_code, department, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        user.email,
                        user.phone,
                        user.password_hash, // Copy the hash directly
                        user.first_name,
                        user.last_name,
                        user.role,
                        user.is_active,
                        user.employee_code,
                        user.department,
                        user.created_at
                    ]
                );

                console.log(`✅ Added ${user.email || user.phone} (${user.first_name} ${user.last_name})`);
                addedUsers.push({
                    email: user.email,
                    phone: user.phone,
                    name: `${user.first_name} ${user.last_name}`,
                    role: user.role
                });
                added++;

            } catch (err) {
                console.error(`❌ Error adding ${user.email || user.phone}:`, err.message);
                errors++;
            }
        }

        console.log(`\n✅ Sync complete: ${added} added, ${skipped} skipped, ${errors} errors`);

        res.json({
            success: true,
            message: 'User sync completed',
            stats: {
                total: serviceHubUsers.rows.length,
                added,
                skipped,
                errors
            },
            addedUsers
        });

    } catch (error) {
        console.error('❌ Sync error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to sync users',
            message: error.message
        });
    }
});

/**
 * GET /api/sync/status
 * Check sync status - compare Service Hub users with Tracking App users
 */
router.get('/status', async (req, res) => {
    try {
        const serviceHubUsers = await serviceHubPool.query(
            'SELECT COUNT(*) as count FROM employees WHERE is_active = true AND password_hash IS NOT NULL'
        );

        const trackingUsers = await pool.query(
            'SELECT COUNT(*) as count FROM employees WHERE is_active = true'
        );

        const serviceHubCount = parseInt(serviceHubUsers.rows[0].count);
        const trackingCount = parseInt(trackingUsers.rows[0].count);

        res.json({
            serviceHub: serviceHubCount,
            trackingApp: trackingCount,
            inSync: serviceHubCount === trackingCount,
            needsSync: serviceHubCount > trackingCount
        });

    } catch (error) {
        console.error('❌ Status check error:', error.message);
        res.status(500).json({ error: 'Failed to check sync status' });
    }
});

export default router;

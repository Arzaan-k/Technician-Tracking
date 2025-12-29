import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/admin/technicians
 * Get all technicians for the admin map (from Service Hub's users table)
 */
router.get('/technicians', authenticateToken, async (req, res) => {
    try {
        // Query Service Hub's users table directly
        const result = await pool.query(`
            SELECT 
                u.id as technician_id,
                u.id as user_id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                'active' as technician_status,
                NULL as last_lat,
                NULL as last_lng,
                NULL as location_address
            FROM users u
            WHERE u.is_active = true
              AND u.role IN ('technician', 'senior_technician')
            ORDER BY u.name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get technicians error:', error.message);
        res.status(500).json({ error: 'Failed to fetch technicians' });
    }
});

/**
 * GET /api/admin/live-map
 * Get live locations for all active technicians
 * Uses Service Hub's location_logs table (user_id references users.id)
 */
router.get('/live-map', authenticateToken, async (req, res) => {
    try {
        // Get technician IDs from query param for filtering (optional)
        const technicianIds = req.query.ids ? req.query.ids.split(',') : null;

        // Query that gets latest location for each user directly
        let query = `
            SELECT DISTINCT ON (u.id)
                u.id as technician_id,
                u.id as user_id,
                u.name,
                u.email,
                u.role,
                l.latitude,
                l.longitude,
                l.speed,
                l.battery_level,
                l.accuracy,
                l.timestamp as last_seen,
                CASE 
                    WHEN l.timestamp > NOW() - INTERVAL '5 minutes' THEN 'online'
                    WHEN l.timestamp > NOW() - INTERVAL '30 minutes' THEN 'idle'
                    ELSE 'offline'
                END as status
            FROM users u
            LEFT JOIN location_logs l ON l.user_id = u.id
            WHERE u.is_active = true
              AND u.role IN ('technician', 'senior_technician')
        `;

        const params = [];

        if (technicianIds && technicianIds.length > 0) {
            query += ` AND u.id = ANY($1::varchar[])`;
            params.push(technicianIds);
        }

        query += `
            ORDER BY u.id, l.timestamp DESC NULLS LAST
        `;

        const result = await pool.query(query, params);

        // Map results, only include technicians with location data
        const technicians = result.rows
            .filter(row => row.latitude && row.longitude)
            .map(row => ({
                id: row.technician_id,
                userId: row.user_id,
                name: row.name || 'Unknown',
                email: row.email,
                role: row.role,
                position: [parseFloat(row.latitude), parseFloat(row.longitude)],
                speed: row.speed ? Math.round(parseFloat(row.speed) * 3.6) : 0,
                battery: row.battery_level || null,
                accuracy: row.accuracy ? Math.round(parseFloat(row.accuracy)) : null,
                address: null,
                lastSeen: row.last_seen || new Date().toISOString(),
                status: row.last_seen ? row.status : 'offline'
            }));

        res.json(technicians);
    } catch (error) {
        console.error('Admin Live Map Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch fleet data' });
    }
});

/**
 * GET /api/admin/technician/:id/history
 * Get location history for a specific technician
 */
router.get('/technician/:id/history', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const date = req.query.date;

    try {
        let query = `
            SELECT id, latitude, longitude, accuracy, speed, timestamp, battery_level
            FROM location_logs 
            WHERE user_id = $1
        `;
        const params = [id];

        if (date) {
            query += ` AND DATE(timestamp) = $2`;
            params.push(date);
        }

        query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Technician history error:', error.message);
        res.status(500).json({ error: 'Failed to fetch technician history' });
    }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics for admin
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // Get total technicians
        const totalResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM users u
            WHERE u.is_active = true
              AND u.role IN ('technician', 'senior_technician')
        `);

        // Get online technicians (active in last 5 minutes)
        const onlineResult = await pool.query(`
            SELECT COUNT(DISTINCT u.id) as online
            FROM users u
            JOIN location_logs l ON l.user_id = u.id
            WHERE u.is_active = true
              AND u.role IN ('technician', 'senior_technician')
              AND l.timestamp > NOW() - INTERVAL '5 minutes'
        `);

        // Get tracking sessions today
        const sessionsResult = await pool.query(`
            SELECT COUNT(*) as sessions_today
            FROM tracking_sessions
            WHERE DATE(start_time) = CURRENT_DATE
        `);

        // Get total distance today
        const distanceResult = await pool.query(`
            SELECT COALESCE(SUM(total_distance), 0) as total_distance_km
            FROM tracking_sessions
            WHERE DATE(start_time) = CURRENT_DATE
              AND status = 'completed'
        `);

        res.json({
            totalTechnicians: parseInt(totalResult.rows[0].total),
            onlineTechnicians: parseInt(onlineResult.rows[0].online),
            sessionsToday: parseInt(sessionsResult.rows[0]?.sessions_today || 0),
            totalDistanceToday: parseFloat(distanceResult.rows[0]?.total_distance_km || 0).toFixed(2)
        });
    } catch (error) {
        console.error('Admin stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;

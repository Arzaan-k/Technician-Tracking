import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/admin/live-map
 * Get live locations for all active technicians
 * Requires admin authentication
 */
router.get('/live-map', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT ON (l.employee_id)
                e.employee_id,
                e.first_name,
                e.last_name,
                e.email,
                l.latitude,
                l.longitude,
                l.heading,
                l.speed,
                l.battery_level,
                l.timestamp as last_seen
            FROM location_logs l
            JOIN employees e ON l.employee_id = e.employee_id
            WHERE e.is_active = true
              AND l.timestamp > NOW() - INTERVAL '24 hours'
            ORDER BY l.employee_id, l.timestamp DESC
        `;

        const result = await pool.query(query);

        const technicians = result.rows.map(row => ({
            id: row.employee_id,
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            position: [parseFloat(row.latitude), parseFloat(row.longitude)],
            heading: row.heading ? parseFloat(row.heading) : 0,
            speed: row.speed ? Math.round(row.speed * 3.6) : 0,
            battery: row.battery_level,
            lastSeen: row.last_seen,
            status: (new Date() - new Date(row.last_seen)) < 5 * 60 * 1000 ? 'online' : 'offline'
        }));

        res.json(technicians);
    } catch (error) {
        console.error('Admin Live Map Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch fleet data' });
    }
});

/**
 * GET /api/admin/technicians
 * Get all technicians with their status
 */
router.get('/technicians', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                e.employee_id,
                e.email,
                e.first_name,
                e.last_name,
                e.role,
                e.is_active,
                e.last_login,
                ts.status as tracking_status,
                ts.start_time as tracking_since
            FROM employees e
            LEFT JOIN LATERAL (
                SELECT status, start_time 
                FROM tracking_sessions 
                WHERE employee_id = e.employee_id 
                ORDER BY start_time DESC 
                LIMIT 1
            ) ts ON true
            WHERE e.role IN ('technician', 'field_technician')
            ORDER BY e.first_name, e.last_name
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get technicians error:', error.message);
        res.status(500).json({ error: 'Failed to fetch technicians' });
    }
});

/**
 * GET /api/admin/technician/:id/history
 * Get location history for a specific technician
 */
router.get('/technician/:id/history', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const date = req.query.date; // Optional date filter (YYYY-MM-DD)

    try {
        let query = `
            SELECT id, latitude, longitude, accuracy, speed, heading, timestamp, battery_level
            FROM location_logs 
            WHERE employee_id = $1
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

export default router;

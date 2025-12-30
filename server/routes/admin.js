import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ==================== EMPLOYEE MANAGEMENT ====================

/**
 * GET /api/admin/employees
 * Get all employees with their tracking statistics
 */
router.get('/employees', authenticateToken, async (req, res) => {
    try {
        const { status, search, sortBy, sortOrder } = req.query;

        let query = `
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                u.created_at,
                (
                    SELECT COUNT(*) 
                    FROM tracking_sessions ts 
                    WHERE ts.user_id = u.id
                ) as total_sessions,
                (
                    SELECT COALESCE(SUM(ts.total_distance), 0) 
                    FROM tracking_sessions ts 
                    WHERE ts.user_id = u.id
                ) as total_distance,
                (
                    SELECT l.timestamp 
                    FROM location_logs l 
                    WHERE l.user_id = u.id 
                    ORDER BY l.timestamp DESC 
                    LIMIT 1
                ) as last_seen,
                (
                    SELECT COUNT(*) 
                    FROM tracking_sessions ts 
                    WHERE ts.user_id = u.id AND DATE(ts.start_time) = CURRENT_DATE
                ) as sessions_today,
                (
                    SELECT COALESCE(SUM(ts.total_distance), 0) 
                    FROM tracking_sessions ts 
                    WHERE ts.user_id = u.id AND DATE(ts.start_time) = CURRENT_DATE
                ) as distance_today
            FROM users u
            WHERE u.role IN ('technician', 'senior_technician', 'admin')
        `;

        const params = [];
        let paramIndex = 1;

        // Filter by status
        if (status === 'active') {
            query += ` AND u.is_active = true`;
        } else if (status === 'inactive') {
            query += ` AND u.is_active = false`;
        }

        // Search by name or email
        if (search) {
            query += ` AND (LOWER(u.name) LIKE $${paramIndex} OR LOWER(u.email) LIKE $${paramIndex})`;
            params.push(`%${search.toLowerCase()}%`);
            paramIndex++;
        }

        // Sorting
        const validSortColumns = ['name', 'email', 'created_at', 'total_sessions', 'total_distance', 'last_seen'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
        const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortColumn} ${order} NULLS LAST`;

        const result = await pool.query(query, params);

        // Calculate online status
        const employees = result.rows.map(emp => ({
            ...emp,
            total_distance: parseFloat(emp.total_distance || 0).toFixed(2),
            distance_today: parseFloat(emp.distance_today || 0).toFixed(2),
            status: emp.last_seen && new Date(emp.last_seen) > new Date(Date.now() - 5 * 60 * 1000)
                ? 'online'
                : emp.last_seen && new Date(emp.last_seen) > new Date(Date.now() - 30 * 60 * 1000)
                    ? 'idle'
                    : 'offline'
        }));

        res.json(employees);
    } catch (error) {
        console.error('Get employees error:', error.message);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

/**
 * GET /api/admin/employees/:id
 * Get detailed employee information
 */
router.get('/employees/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Get employee details
        const empResult = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                u.is_active,
                u.created_at
            FROM users u
            WHERE u.id = $1
        `, [id]);

        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const employee = empResult.rows[0];

        // Get tracking statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_sessions,
                COALESCE(SUM(total_distance), 0) as total_distance,
                COALESCE(SUM(total_locations), 0) as total_locations,
                COALESCE(AVG(EXTRACT(EPOCH FROM total_duration)), 0) as avg_session_duration,
                MIN(start_time) as first_session,
                MAX(start_time) as last_session
            FROM tracking_sessions
            WHERE user_id = $1
        `, [id]);

        // Get last 7 days activity
        const weeklyResult = await pool.query(`
            SELECT 
                DATE(start_time) as date,
                COUNT(*) as sessions,
                COALESCE(SUM(total_distance), 0) as distance,
                COALESCE(SUM(total_locations), 0) as locations
            FROM tracking_sessions
            WHERE user_id = $1 AND start_time >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(start_time)
            ORDER BY date DESC
        `, [id]);

        // Get current location
        const locationResult = await pool.query(`
            SELECT latitude, longitude, accuracy, speed, battery_level, timestamp
            FROM location_logs
            WHERE user_id = $1
            ORDER BY timestamp DESC
            LIMIT 1
        `, [id]);

        res.json({
            ...employee,
            stats: {
                ...statsResult.rows[0],
                total_distance: parseFloat(statsResult.rows[0]?.total_distance || 0).toFixed(2),
                avg_session_duration: Math.round(parseFloat(statsResult.rows[0]?.avg_session_duration || 0) / 60)
            },
            weeklyActivity: weeklyResult.rows.map(row => ({
                ...row,
                distance: parseFloat(row.distance).toFixed(2)
            })),
            currentLocation: locationResult.rows[0] || null
        });
    } catch (error) {
        console.error('Get employee detail error:', error.message);
        res.status(500).json({ error: 'Failed to fetch employee details' });
    }
});

/**
 * GET /api/admin/employees/:id/sessions
 * Get all sessions for a specific employee
 */
router.get('/employees/:id/sessions', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    try {
        let query = `
            SELECT 
                session_id,
                start_time,
                end_time,
                status,
                total_distance,
                total_locations,
                EXTRACT(EPOCH FROM total_duration) as duration_seconds
            FROM tracking_sessions
            WHERE user_id = $1
        `;

        const params = [id];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND DATE(start_time) >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND DATE(start_time) <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY start_time DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        res.json(result.rows.map(session => ({
            ...session,
            total_distance: parseFloat(session.total_distance || 0).toFixed(2),
            duration_minutes: Math.round(parseFloat(session.duration_seconds || 0) / 60)
        })));
    } catch (error) {
        console.error('Get employee sessions error:', error.message);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/admin/analytics/overview
 * Get overall analytics dashboard data
 */
router.get('/analytics/overview', authenticateToken, async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        const dateFilter = startDate && endDate
            ? `AND ts.start_time BETWEEN '${startDate}' AND '${endDate}'`
            : '';

        // Overall stats
        const overallStats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role IN ('technician', 'senior_technician') AND is_active = true) as total_employees,
                (SELECT COUNT(DISTINCT user_id) FROM location_logs WHERE timestamp > NOW() - INTERVAL '5 minutes') as online_now,
                (SELECT COUNT(*) FROM tracking_sessions WHERE DATE(start_time) = CURRENT_DATE) as sessions_today,
                (SELECT COALESCE(SUM(total_distance), 0) FROM tracking_sessions WHERE DATE(start_time) = CURRENT_DATE) as distance_today,
                (SELECT COUNT(*) FROM location_logs WHERE DATE(timestamp) = CURRENT_DATE) as locations_today
        `);

        // Sessions by day (last 7 days)
        const dailySessions = await pool.query(`
            SELECT 
                DATE(start_time) as date,
                COUNT(*) as sessions,
                COALESCE(SUM(total_distance), 0) as distance,
                COUNT(DISTINCT user_id) as active_employees
            FROM tracking_sessions
            WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(start_time)
            ORDER BY date ASC
        `);

        // Top performers (by distance this week)
        const topPerformers = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                COUNT(ts.session_id) as sessions,
                COALESCE(SUM(ts.total_distance), 0) as distance
            FROM users u
            LEFT JOIN tracking_sessions ts ON ts.user_id = u.id 
                AND ts.start_time >= CURRENT_DATE - INTERVAL '7 days'
            WHERE u.role IN ('technician', 'senior_technician') AND u.is_active = true
            GROUP BY u.id, u.name, u.email
            ORDER BY distance DESC
            LIMIT 5
        `);

        // Activity by hour (today)
        const hourlyActivity = await pool.query(`
            SELECT 
                EXTRACT(HOUR FROM timestamp) as hour,
                COUNT(*) as locations
            FROM location_logs
            WHERE DATE(timestamp) = CURRENT_DATE
            GROUP BY EXTRACT(HOUR FROM timestamp)
            ORDER BY hour ASC
        `);

        res.json({
            overview: {
                ...overallStats.rows[0],
                distance_today: parseFloat(overallStats.rows[0]?.distance_today || 0).toFixed(2)
            },
            dailySessions: dailySessions.rows.map(row => ({
                ...row,
                distance: parseFloat(row.distance).toFixed(2)
            })),
            topPerformers: topPerformers.rows.map(row => ({
                ...row,
                distance: parseFloat(row.distance).toFixed(2)
            })),
            hourlyActivity: hourlyActivity.rows
        });
    } catch (error) {
        console.error('Analytics overview error:', error.message);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

/**
 * GET /api/admin/analytics/employees
 * Get comparative analytics for all employees
 */
router.get('/analytics/employees', authenticateToken, async (req, res) => {
    const { period = '7d' } = req.query;

    let interval;
    switch (period) {
        case '1d': interval = '1 day'; break;
        case '30d': interval = '30 days'; break;
        case '90d': interval = '90 days'; break;
        default: interval = '7 days';
    }

    try {
        const result = await pool.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role,
                COUNT(ts.session_id) as sessions,
                COALESCE(SUM(ts.total_distance), 0) as distance,
                COALESCE(SUM(ts.total_locations), 0) as locations,
                COALESCE(AVG(EXTRACT(EPOCH FROM ts.total_duration)), 0) as avg_duration,
                (
                    SELECT l.timestamp 
                    FROM location_logs l 
                    WHERE l.user_id = u.id 
                    ORDER BY l.timestamp DESC 
                    LIMIT 1
                ) as last_seen
            FROM users u
            LEFT JOIN tracking_sessions ts ON ts.user_id = u.id 
                AND ts.start_time >= CURRENT_DATE - INTERVAL '${interval}'
            WHERE u.role IN ('technician', 'senior_technician') AND u.is_active = true
            GROUP BY u.id, u.name, u.email, u.role
            ORDER BY distance DESC
        `);

        res.json(result.rows.map(row => ({
            ...row,
            distance: parseFloat(row.distance).toFixed(2),
            avg_duration_minutes: Math.round(parseFloat(row.avg_duration || 0) / 60),
            status: row.last_seen && new Date(row.last_seen) > new Date(Date.now() - 5 * 60 * 1000)
                ? 'online'
                : row.last_seen && new Date(row.last_seen) > new Date(Date.now() - 30 * 60 * 1000)
                    ? 'idle'
                    : 'offline'
        })));
    } catch (error) {
        console.error('Employee analytics error:', error.message);
        res.status(500).json({ error: 'Failed to fetch employee analytics' });
    }
});

/**
 * GET /api/admin/analytics/daily
 * Get daily breakdown analytics
 */
router.get('/analytics/daily', authenticateToken, async (req, res) => {
    const { days = 30 } = req.query;

    try {
        const result = await pool.query(`
            SELECT 
                DATE(start_time) as date,
                COUNT(*) as total_sessions,
                COUNT(DISTINCT user_id) as active_employees,
                COALESCE(SUM(total_distance), 0) as total_distance,
                COALESCE(SUM(total_locations), 0) as total_locations,
                COALESCE(AVG(EXTRACT(EPOCH FROM total_duration)), 0) as avg_duration
            FROM tracking_sessions
            WHERE start_time >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
            GROUP BY DATE(start_time)
            ORDER BY date DESC
        `);

        res.json(result.rows.map(row => ({
            ...row,
            total_distance: parseFloat(row.total_distance).toFixed(2),
            avg_duration_minutes: Math.round(parseFloat(row.avg_duration || 0) / 60)
        })));
    } catch (error) {
        console.error('Daily analytics error:', error.message);
        res.status(500).json({ error: 'Failed to fetch daily analytics' });
    }
});

// ==================== LIVE TRACKING ====================

/**
 * GET /api/admin/technicians
 * Get all technicians for the admin map (from Service Hub's users table)
 */
router.get('/technicians', authenticateToken, async (req, res) => {
    try {
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
 */
router.get('/live-map', authenticateToken, async (req, res) => {
    try {
        const technicianIds = req.query.ids ? req.query.ids.split(',') : null;

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

        query += ` ORDER BY u.id, l.timestamp DESC NULLS LAST`;

        const result = await pool.query(query, params);

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
        const totalResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM users u
            WHERE u.is_active = true
              AND u.role IN ('technician', 'senior_technician')
        `);

        const onlineResult = await pool.query(`
            SELECT COUNT(DISTINCT u.id) as online
            FROM users u
            JOIN location_logs l ON l.user_id = u.id
            WHERE u.is_active = true
              AND u.role IN ('technician', 'senior_technician')
              AND l.timestamp > NOW() - INTERVAL '5 minutes'
        `);

        const sessionsResult = await pool.query(`
            SELECT COUNT(*) as sessions_today
            FROM tracking_sessions
            WHERE DATE(start_time) = CURRENT_DATE
        `);

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

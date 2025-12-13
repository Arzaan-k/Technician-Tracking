
import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Start Tracking Session
router.post('/start', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;

    try {
        const result = await pool.query(
            `INSERT INTO tracking_sessions (employee_id, start_time, status)
       VALUES ($1, CURRENT_TIMESTAMP, 'active')
       RETURNING session_id, start_time`,
            [employeeId]
        );

        res.json({ success: true, session: result.rows[0] });
    } catch (error) {
        console.error('Start tracking error:', error);
        res.status(500).json({ error: 'Failed to start tracking' });
    }
});

// Update Locations (Bulk)
router.post('/update', authenticateToken, async (req, res) => {
    const { locations } = req.body;
    const { employeeId } = req.user;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: 'No locations provided' });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const queryText = `
        INSERT INTO location_logs (employee_id, latitude, longitude, accuracy, speed, heading, timestamp, battery_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

            for (const loc of locations) {
                // Postgres expects Date object or ISO string for timestamp columns
                const timestamp = new Date(loc.timestamp);

                await client.query(queryText, [
                    employeeId,
                    loc.latitude,
                    loc.longitude,
                    loc.accuracy,
                    loc.speed,
                    loc.heading,
                    timestamp,
                    loc.batteryLevel
                ]);
            }

            await client.query('COMMIT');
            console.log(`Synced ${locations.length} locations for user ${employeeId}`);
            res.json({ success: true, count: locations.length });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ error: 'Failed to update locations' });
    }
});

// Stop Tracking Session
router.post('/stop', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;
    const { distance } = req.body;

    try {
        const result = await pool.query(
            `UPDATE tracking_sessions 
       SET end_time = CURRENT_TIMESTAMP, status = 'completed', total_distance = $2
       WHERE employee_id = $1 AND status = 'active'
       RETURNING session_id, end_time, total_distance`,
            [employeeId, distance || 0]
        );

        res.json({ success: true, session: result.rows[0] });
    } catch (error) {
        console.error('Stop tracking error:', error);
        res.status(500).json({ error: 'Failed to stop tracking' });
    }
});


// Get Location History
router.get('/history', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;
    const limit = req.query.limit || 50;

    try {
        const result = await pool.query(
            `SELECT * FROM location_logs 
       WHERE employee_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
            [employeeId, limit]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

export default router;

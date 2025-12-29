import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/location/start
 * Start a new tracking session for the authenticated technician
 */
router.post('/start', authenticateToken, async (req, res) => {
    const { employeeId } = req.user; // employeeId is actually user.id from Service Hub

    try {
        // Check for existing active session and close it
        await pool.query(
            `UPDATE tracking_sessions 
             SET end_time = CURRENT_TIMESTAMP, status = 'completed' 
             WHERE user_id = $1 AND status = 'active'`,
            [employeeId]
        );

        // Create new session
        const result = await pool.query(
            `INSERT INTO tracking_sessions (user_id, start_time, status)
             VALUES ($1, CURRENT_TIMESTAMP, 'active')
             RETURNING session_id, start_time`,
            [employeeId]
        );

        res.json({ 
            success: true, 
            session: result.rows[0] 
        });
    } catch (error) {
        console.error('Start tracking error:', error.message);
        res.status(500).json({ error: 'Failed to start tracking session' });
    }
});

/**
 * POST /api/location/update
 * Bulk update location logs for the authenticated technician
 */
router.post('/update', authenticateToken, async (req, res) => {
    const { locations } = req.body;
    const { employeeId } = req.user;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: 'No locations provided' });
    }

    // Validate location data
    for (const loc of locations) {
        if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
            return res.status(400).json({ error: 'Invalid location data' });
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const queryText = `
            INSERT INTO location_logs 
            (user_id, latitude, longitude, accuracy, speed, heading, timestamp, battery_level, network_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const loc of locations) {
            const timestamp = loc.timestamp ? new Date(loc.timestamp) : new Date();

            await client.query(queryText, [
                employeeId,
                loc.latitude,
                loc.longitude,
                loc.accuracy || null,
                loc.speed || null,
                loc.heading || null,
                timestamp,
                loc.batteryLevel || null,
                loc.networkStatus || 'unknown'
            ]);
        }

        // Update session stats
        await client.query(
            `UPDATE tracking_sessions 
             SET total_locations = total_locations + $2, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND status = 'active'`,
            [employeeId, locations.length]
        );

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            count: locations.length 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Location update error:', error.message);
        res.status(500).json({ error: 'Failed to update locations' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/location/stop
 * Stop the active tracking session
 */
router.post('/stop', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;
    const { distance } = req.body;

    try {
        const result = await pool.query(
            `UPDATE tracking_sessions 
             SET end_time = CURRENT_TIMESTAMP, 
                 status = 'completed', 
                 total_distance = $2,
                 total_duration = CURRENT_TIMESTAMP - start_time
             WHERE user_id = $1 AND status = 'active'
             RETURNING session_id, start_time, end_time, total_distance, total_locations`,
            [employeeId, distance || 0]
        );

        if (result.rows.length === 0) {
            return res.json({ 
                success: true, 
                message: 'No active session found' 
            });
        }

        res.json({ 
            success: true, 
            session: result.rows[0] 
        });
    } catch (error) {
        console.error('Stop tracking error:', error.message);
        res.status(500).json({ error: 'Failed to stop tracking session' });
    }
});

/**
 * GET /api/location/history
 * Get location history for the authenticated technician
 */
router.get('/history', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);

    try {
        const result = await pool.query(
            `SELECT id, latitude, longitude, accuracy, speed, heading, timestamp, battery_level, network_status
             FROM location_logs 
             WHERE user_id = $1 
             ORDER BY timestamp DESC 
             LIMIT $2`,
            [employeeId, limit]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('History error:', error.message);
        res.status(500).json({ error: 'Failed to fetch location history' });
    }
});

/**
 * GET /api/location/session
 * Get current active session status
 */
router.get('/session', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;

    try {
        const result = await pool.query(
            `SELECT session_id, start_time, status, total_distance, total_locations
             FROM tracking_sessions 
             WHERE user_id = $1 AND status = 'active'
             ORDER BY start_time DESC
             LIMIT 1`,
            [employeeId]
        );

        if (result.rows.length === 0) {
            return res.json({ 
                active: false, 
                session: null 
            });
        }

        res.json({ 
            active: true, 
            session: result.rows[0] 
        });
    } catch (error) {
        console.error('Session status error:', error.message);
        res.status(500).json({ error: 'Failed to fetch session status' });
    }
});

/**
 * GET /api/location/sessions
 * Get tracking session history with start/end locations
 */
router.get('/sessions', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    try {
        // Get sessions with aggregated data
        const result = await pool.query(
            `SELECT 
                ts.session_id, 
                ts.start_time, 
                ts.end_time, 
                ts.status, 
                ts.total_distance, 
                ts.total_locations,
                EXTRACT(EPOCH FROM (COALESCE(ts.end_time, CURRENT_TIMESTAMP) - ts.start_time)) as duration_seconds
             FROM tracking_sessions ts
             WHERE ts.user_id = $1 
             ORDER BY ts.start_time DESC 
             LIMIT $2`,
            [employeeId, limit]
        );

        // For each session, get start and end locations
        const sessions = await Promise.all(result.rows.map(async (session) => {
            // Get first location (start)
            const startLoc = await pool.query(
                `SELECT latitude, longitude, timestamp 
                 FROM location_logs 
                 WHERE user_id = $1 
                   AND timestamp >= $2 
                   AND timestamp <= COALESCE($3, CURRENT_TIMESTAMP)
                 ORDER BY timestamp ASC 
                 LIMIT 1`,
                [employeeId, session.start_time, session.end_time]
            );

            // Get last location (end)
            const endLoc = await pool.query(
                `SELECT latitude, longitude, timestamp 
                 FROM location_logs 
                 WHERE user_id = $1 
                   AND timestamp >= $2 
                   AND timestamp <= COALESCE($3, CURRENT_TIMESTAMP)
                 ORDER BY timestamp DESC 
                 LIMIT 1`,
                [employeeId, session.start_time, session.end_time]
            );

            // Calculate stationary vs moving time
            const movementStats = await pool.query(
                `SELECT 
                    COUNT(*) FILTER (WHERE speed IS NULL OR speed < 0.5) as stationary_points,
                    COUNT(*) FILTER (WHERE speed >= 0.5) as moving_points,
                    AVG(speed) FILTER (WHERE speed >= 0.5) as avg_speed,
                    MAX(speed) as max_speed
                 FROM location_logs 
                 WHERE user_id = $1 
                   AND timestamp >= $2 
                   AND timestamp <= COALESCE($3, CURRENT_TIMESTAMP)`,
                [employeeId, session.start_time, session.end_time]
            );

            const stats = movementStats.rows[0];
            const totalPoints = parseInt(stats.stationary_points || 0) + parseInt(stats.moving_points || 0);
            const stationaryPercent = totalPoints > 0 ? (parseInt(stats.stationary_points || 0) / totalPoints) * 100 : 0;

            return {
                ...session,
                start_location: startLoc.rows[0] || null,
                end_location: endLoc.rows[0] || null,
                stationary_percent: Math.round(stationaryPercent),
                moving_percent: Math.round(100 - stationaryPercent),
                avg_speed: stats.avg_speed ? parseFloat(stats.avg_speed) * 3.6 : 0, // Convert to km/h
                max_speed: stats.max_speed ? parseFloat(stats.max_speed) * 3.6 : 0
            };
        }));

        res.json(sessions);
    } catch (error) {
        console.error('Sessions history error:', error.message);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * GET /api/location/sessions/:sessionId
 * Get detailed session data with all location points for route display
 */
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
    const { employeeId } = req.user;
    const { sessionId } = req.params;

    try {
        // Get session details
        const sessionResult = await pool.query(
            `SELECT session_id, start_time, end_time, status, total_distance, total_locations
             FROM tracking_sessions 
             WHERE session_id = $1 AND user_id = $2`,
            [sessionId, employeeId]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessionResult.rows[0];

        // Get all location points for the route
        const locations = await pool.query(
            `SELECT latitude, longitude, accuracy, speed, heading, timestamp, battery_level
             FROM location_logs 
             WHERE user_id = $1 
               AND timestamp >= $2 
               AND timestamp <= COALESCE($3, CURRENT_TIMESTAMP)
             ORDER BY timestamp ASC`,
            [employeeId, session.start_time, session.end_time]
        );

        // Identify stops (clusters of stationary points)
        const stops = [];
        let currentStop = null;
        const STOP_THRESHOLD = 0.5; // m/s - below this is considered stationary
        const MIN_STOP_DURATION = 60000; // 1 minute minimum to count as a stop

        for (const loc of locations.rows) {
            const isStationary = !loc.speed || loc.speed < STOP_THRESHOLD;
            
            if (isStationary) {
                if (!currentStop) {
                    currentStop = {
                        start_time: loc.timestamp,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        points: [loc]
                    };
                } else {
                    currentStop.points.push(loc);
                    currentStop.end_time = loc.timestamp;
                }
            } else if (currentStop) {
                // Check if stop was long enough
                const stopDuration = new Date(currentStop.end_time || currentStop.start_time) - new Date(currentStop.start_time);
                if (stopDuration >= MIN_STOP_DURATION) {
                    // Calculate average position for the stop
                    const avgLat = currentStop.points.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / currentStop.points.length;
                    const avgLon = currentStop.points.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / currentStop.points.length;
                    
                    stops.push({
                        latitude: avgLat,
                        longitude: avgLon,
                        start_time: currentStop.start_time,
                        end_time: currentStop.end_time || currentStop.start_time,
                        duration_minutes: Math.round(stopDuration / 60000)
                    });
                }
                currentStop = null;
            }
        }

        // Don't forget the last stop if session ended while stationary
        if (currentStop && currentStop.end_time) {
            const stopDuration = new Date(currentStop.end_time) - new Date(currentStop.start_time);
            if (stopDuration >= MIN_STOP_DURATION) {
                const avgLat = currentStop.points.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / currentStop.points.length;
                const avgLon = currentStop.points.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / currentStop.points.length;
                
                stops.push({
                    latitude: avgLat,
                    longitude: avgLon,
                    start_time: currentStop.start_time,
                    end_time: currentStop.end_time,
                    duration_minutes: Math.round(stopDuration / 60000)
                });
            }
        }

        res.json({
            session,
            route: locations.rows.map(loc => ({
                lat: parseFloat(loc.latitude),
                lng: parseFloat(loc.longitude),
                timestamp: loc.timestamp,
                speed: loc.speed ? parseFloat(loc.speed) * 3.6 : 0 // km/h
            })),
            stops
        });
    } catch (error) {
        console.error('Session details error:', error.message);
        res.status(500).json({ error: 'Failed to fetch session details' });
    }
});

export default router;

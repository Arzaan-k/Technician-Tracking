
import express from 'express';
import serviceHubPool from '../serviceHub.js';

const router = express.Router();

// Get live locations for all 'active' technicians from Service Hub
router.get('/live-map', async (req, res) => {
    try {
        // Query to get the LATEST location for each unique employee
        // We join with employees to get names
        const query = `
            SELECT DISTINCT ON (l.employee_id)
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
            WHERE l.timestamp > NOW() - INTERVAL '24 hours' -- Only active in last 24h
            ORDER BY l.employee_id, l.timestamp DESC;
        `;

        const result = await serviceHubPool.query(query);

        const technicians = result.rows.map(row => ({
            id: row.email, // using email as key since it's unique and human readable
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            position: [parseFloat(row.latitude), parseFloat(row.longitude)],
            heading: row.heading ? parseFloat(row.heading) : 0,
            speed: row.speed ? Math.round(row.speed * 3.6) : 0, // convert m/s to km/h
            battery: row.battery_level,
            lastSeen: row.last_seen,
            status: (new Date() - new Date(row.last_seen)) < 5 * 60 * 1000 ? 'online' : 'offline'
        }));

        res.json(technicians);
    } catch (error) {
        console.error('Admin Live Map Error:', error);
        res.status(500).json({ error: 'Failed to fetch fleet data' });
    }
});

export default router;

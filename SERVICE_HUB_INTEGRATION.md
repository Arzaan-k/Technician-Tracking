# Service Hub Integration Guide

Use this logic in your **Service Hub Application** to fetch real-time locations of all technicians.

## 1. Database Connection

You need to connect to the same PostgreSQL database where the data is being stored.

**Dependencies:**
```bash
npm install pg
```

**Code:**
```javascript
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: 'postgresql://neondb_owner:npg_ls7YTgzeoNA4@ep-young-grass-aewvokzj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
    ssl: true,
});
```

## 2. SQL Query (The Logic)

This query retrieves the **most recent location** for every active technician. It filters out old data (older than 24 hours) and joins with the `employees` table to get names.

```sql
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
WHERE l.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY l.employee_id, l.timestamp DESC;
```

## 3. Node.js Implementation Function

Copy this function into your backend API to serve the map data.

```javascript
async function getLiveFleetData() {
    try {
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
            WHERE l.timestamp > NOW() - INTERVAL '24 hours'
            ORDER BY l.employee_id, l.timestamp DESC;
        `;

        const result = await pool.query(query);

        // Format for Frontend
        return result.rows.map(row => ({
            id: row.email,
            name: `${row.first_name} ${row.last_name}`,
            position: {
                lat: parseFloat(row.latitude),
                lng: parseFloat(row.longitude)
            },
            status: {
                speedKm: row.speed ? Math.round(row.speed * 3.6) : 0,
                battery: row.battery_level,
                isOnline: (new Date() - new Date(row.last_seen)) < 5 * 60 * 1000 // Considered online if updated in last 5 mins
            },
            lastSeen: row.last_seen
        }));
    } catch (error) {
        console.error('Error fetching fleet data:', error);
        return [];
    }
}
```

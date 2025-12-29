import jwt from 'jsonwebtoken';
import pool from '../db.js';

/**
 * Middleware to authenticate JWT token
 * Works with Service Hub's unified users table
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        try {
            // Verify user still exists and is active in Service Hub's users table
            const result = await pool.query(
                'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
                [decoded.employeeId || decoded.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            if (user.is_active === false) {
                return res.status(403).json({ error: 'Account is disabled' });
            }

            // Only allow specific roles to access LocTrack
            const allowedRoles = ['technician', 'senior_technician', 'admin', 'super_admin', 'coordinator'];
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to access Location Tracking' });
            }

            // Use user.id directly for everything (no separate employee table)
            req.user = {
                userId: user.id,
                employeeId: user.id, // Keep for backward compatibility
                email: user.email,
                name: user.name,
                role: user.role
            };

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(500).json({ error: 'Authentication failed' });
        }
    });
};

/**
 * Middleware to require admin/coordinator role
 */
export const requireAdmin = (req, res, next) => {
    const adminRoles = ['admin', 'super_admin', 'coordinator'];
    if (!adminRoles.includes(req.user?.role)) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * Middleware to require technician or admin role
 */
export const requireTechnician = (req, res, next) => {
    const allowedRoles = ['technician', 'senior_technician', 'admin', 'super_admin', 'coordinator'];
    if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({ error: 'Technician access required' });
    }
    next();
};

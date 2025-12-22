import jwt from 'jsonwebtoken';
import pool from '../db.js';

/**
 * Middleware to authenticate JWT token
 * Used across all protected routes
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
            // Verify user still exists and is active
            const result = await pool.query(
                'SELECT employee_id, email, role, is_active FROM employees WHERE employee_id = $1',
                [decoded.employeeId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            if (user.is_active === false) {
                return res.status(403).json({ error: 'Account is disabled' });
            }

            req.user = {
                employeeId: user.employee_id,
                email: user.email,
                role: user.role
            };

            next();
        } catch (error) {
            return res.status(500).json({ error: 'Authentication failed' });
        }
    });
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * Middleware to require technician or admin role
 */
export const requireTechnician = (req, res, next) => {
    const allowedRoles = ['technician', 'admin', 'field_technician'];
    if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({ error: 'Technician access required' });
    }
    next();
};


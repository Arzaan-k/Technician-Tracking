import jwt from 'jsonwebtoken';
import pool from '../db.js';

/**
 * Middleware to authenticate JWT token
 * Validates tokens issued by Service Hub using shared JWT_SECRET
 * Enforces role-based access control
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
            // Support both userId (Service Hub format) and employeeId (legacy format)
            const userId = decoded.userId || decoded.employeeId;

            if (!userId) {
                return res.status(403).json({ error: 'Invalid token format' });
            }

            // Verify user still exists and is active
            const result = await pool.query(
                'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            // Immediate access revocation: check if account is disabled
            if (user.is_active === false) {
                return res.status(403).json({ error: 'Account is disabled' });
            }

            // Attach user info to request with standardized field names
            req.user = {
                userId: user.employee_id,
                employeeId: user.employee_id, // Keep for backward compatibility
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role
            };

            next();
        } catch (error) {
            console.error('Authentication middleware error:', error.message);
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
 * Middleware to require technician role
 * Only users with role 'technician' can access tracking endpoints
 */
export const requireTechnician = (req, res, next) => {
    const allowedRoles = ['technician', 'field_technician'];

    if (!req.user?.role) {
        return res.status(403).json({ error: 'User role not found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            error: 'Technician access required. Only users with technician role can access tracking features.'
        });
    }

    next();
};

/**
 * Middleware to require technician or admin role
 */
export const requireTechnicianOrAdmin = (req, res, next) => {
    const allowedRoles = ['technician', 'field_technician', 'admin'];

    if (!req.user?.role) {
        return res.status(403).json({ error: 'User role not found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            error: 'Access denied. Technician or admin role required.'
        });
    }

    next();
};

import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import serviceHubClient from '../serviceHubClient.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Proxy login request to Service Hub (single source of truth)
 * Service Hub validates credentials and issues JWT
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        console.log(`🔄 Proxying login request to Service Hub for: ${email}`);

        // Forward authentication to Service Hub
        const authResult = await serviceHubClient.login(email, password);

        console.log(`✅ Service Hub authenticated user: ${authResult.user.email}`);

        // Return Service Hub response directly to frontend
        // Token is issued by Service Hub, not by this system
        res.json(authResult);

    } catch (error) {
        console.error('Login proxy error:', error.message);

        // Return appropriate error status
        if (error.message.includes('Invalid credentials') || error.message.includes('disabled')) {
            return res.status(401).json({ error: error.message });
        } else if (error.message.includes('unreachable')) {
            return res.status(503).json({ error: 'Authentication service unavailable. Please try again later.' });
        } else {
            return res.status(500).json({ error: 'Authentication failed' });
        }
    }
});

/**
 * GET /api/auth/verify
 * Verify JWT token locally using shared JWT_SECRET
 * Checks user status in local database for immediate access control
 */
router.get('/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        // Verify JWT using shared secret (same as Service Hub)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Extract userId from token (Service Hub uses 'userId' field)
        const userId = decoded.userId || decoded.employeeId;

        if (!userId) {
            return res.status(403).json({ error: 'Invalid token format' });
        }

        // Check user status in local database
        const result = await pool.query(
            'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const employee = result.rows[0];

        // Check if account is still active
        if (employee.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Return user info with standardized field names
        res.json({
            userId: employee.employee_id,
            employeeId: employee.employee_id, // Keep for backward compatibility
            email: employee.email,
            firstName: employee.first_name,
            lastName: employee.last_name,
            name: `${employee.first_name} ${employee.last_name}`,
            role: employee.role
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.error('Verify error:', error.message);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user information from JWT token
 * Alternative endpoint for token validation
 */
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.employeeId;

        const result = await pool.query(
            'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const employee = result.rows[0];

        if (employee.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        res.json({
            userId: employee.employee_id,
            email: employee.email,
            firstName: employee.first_name,
            lastName: employee.last_name,
            name: `${employee.first_name} ${employee.last_name}`,
            role: employee.role,
            isActive: employee.is_active
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.error('Get user error:', error.message);
        res.status(500).json({ error: 'Failed to get user information' });
    }
});

/**
 * POST /api/auth/sso
 * Single Sign-On endpoint - accepts JWT token from URL parameter
 * Validates token and returns user info for auto-login
 */
router.post('/sso', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.employeeId;

        const result = await pool.query(
            'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const employee = result.rows[0];

        if (employee.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Return token and user info for SSO login
        res.json({
            token,
            user: {
                id: employee.employee_id,
                email: employee.email,
                firstName: employee.first_name,
                lastName: employee.last_name,
                name: `${employee.first_name} ${employee.last_name}`,
                role: employee.role
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.error('SSO error:', error.message);
        res.status(500).json({ error: 'SSO authentication failed' });
    }
});

export default router;

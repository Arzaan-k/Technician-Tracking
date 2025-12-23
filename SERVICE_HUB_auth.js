import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

/**
 * POST /auth/login
 * Central authentication endpoint - validates credentials and issues JWT
 * This is the SINGLE SOURCE OF TRUTH for authentication
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        console.log(`🔐 Service Hub: Login attempt for ${email}`);

        // Query user from database (supports email or phone login)
        const result = await pool.query(
            `SELECT employee_id, email, phone, first_name, last_name, role, password_hash, is_active 
             FROM employees 
             WHERE LOWER(email) = LOWER($1) OR phone = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            console.log(`❌ User not found: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if account is active
        if (user.is_active === false) {
            console.log(`❌ Account disabled: ${email}`);
            return res.status(403).json({ error: 'Account is disabled. Please contact your administrator.' });
        }

        // Check if password hash exists
        if (!user.password_hash) {
            console.log(`❌ No password set for: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password using bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            console.log(`❌ Invalid password for: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login timestamp
        await pool.query(
            'UPDATE employees SET last_login = CURRENT_TIMESTAMP WHERE employee_id = $1',
            [user.employee_id]
        );

        // Generate JWT token with standardized payload
        const token = jwt.sign(
            {
                userId: user.employee_id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`✅ Login successful: ${email} (${user.role})`);

        // Return token and user info
        res.json({
            token,
            user: {
                id: user.employee_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /auth/me
 * Validate JWT token and return user information
 * Used by other systems to verify tokens
 */
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const result = await pool.query(
            'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Check if account is still active (immediate revocation)
        if (user.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Return user information
        res.json({
            userId: user.employee_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            isActive: user.is_active
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.error('Token validation error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /auth/user/:userId
 * Get user information by ID (requires valid JWT)
 */
router.get('/user/:userId', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        // Verify requester's token
        jwt.verify(token, process.env.JWT_SECRET);

        const { userId } = req.params;

        // Get requested user from database
        const result = await pool.query(
            'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        res.json({
            userId: user.employee_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            isActive: user.is_active
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.error('Get user error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate technician with email/phone + password
 * Checks is_active status to prevent disabled users from logging in
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // First, check what columns exist in employees table
        const columnsCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'employees'
        `);
        const columns = columnsCheck.rows.map(r => r.column_name);
        console.log('📋 Available columns in employees:', columns.join(', '));

        // Determine password column name (could be password_hash, password, or hashed_password)
        const passwordColumn = columns.includes('password_hash') ? 'password_hash' 
            : columns.includes('password') ? 'password'
            : columns.includes('hashed_password') ? 'hashed_password' : null;

        if (!passwordColumn) {
            console.error('❌ No password column found in employees table!');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Query supports login via email or phone
        const result = await pool.query(
            `SELECT employee_id, email, phone, first_name, last_name, role, ${passwordColumn} as password_hash, is_active 
             FROM employees 
             WHERE LOWER(email) = LOWER($1) OR phone = $1`,
            [email]
        );

        console.log(`🔍 Login attempt for: ${email}`);
        console.log(`📊 Found ${result.rows.length} matching user(s)`);

        if (result.rows.length === 0) {
            // List all emails in DB for debugging
            const allEmails = await pool.query('SELECT email FROM employees LIMIT 10');
            console.log('📧 Sample emails in DB:', allEmails.rows.map(r => r.email).join(', '));
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const employee = result.rows[0];
        console.log(`👤 Found user: ${employee.email}, role: ${employee.role}, active: ${employee.is_active}`);

        // Check if account is active
        if (employee.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled. Please contact your administrator.' });
        }

        // Check if password hash exists
        if (!employee.password_hash) {
            console.error('❌ User has no password hash set!');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        console.log('🔐 Checking password...');
        const isValidPassword = await bcrypt.compare(password, employee.password_hash);
        console.log(`🔐 Password valid: ${isValidPassword}`);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login timestamp
        await pool.query(
            'UPDATE employees SET last_login = CURRENT_TIMESTAMP WHERE employee_id = $1',
            [employee.employee_id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                employeeId: employee.employee_id, 
                email: employee.email, 
                role: employee.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: employee.employee_id,
                email: employee.email,
                firstName: employee.first_name,
                lastName: employee.last_name,
                role: employee.role
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return user info
 */
router.get('/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await pool.query(
            'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
            [decoded.employeeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const employee = result.rows[0];

        // Check if account is still active
        if (employee.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        res.json({
            employeeId: employee.employee_id,
            email: employee.email,
            firstName: employee.first_name,
            lastName: employee.last_name,
            role: employee.role
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.error('Verify error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/register
 * Register a new technician (Admin only in production)
 * This endpoint is for initial setup/testing
 */
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName, role, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if user already exists
        const existing = await pool.query(
            'SELECT employee_id FROM employees WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO employees (email, phone, password_hash, first_name, last_name, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING employee_id, email, first_name, last_name, role`,
            [email, phone || null, hashedPassword, firstName, lastName, role || 'technician']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

export default router;

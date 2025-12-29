
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// Register (Helper endpoint to create initial users)
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO employees (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING employee_id, email, first_name, last_name, role`,
            [email, hashedPassword, firstName, lastName, role || 'technician']
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login - Email and Password (Unified with Service Hub)
// Real-time authentication: Any technician in Service Hub can login here immediately
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if JWT_SECRET is set
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment variables');
            return res.status(500).json({ error: 'Server configuration error: JWT_SECRET missing' });
        }

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Query Service Hub's unified users table directly
        // This enables real-time authentication - no sync needed
        const result = await pool.query(
            `SELECT id, email, name, role, password, is_active 
             FROM users 
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            console.log(`Login attempt failed: User not found for email ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if account is active
        if (user.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        // Role-based access control for LocTrack mobile app
        // Technicians, admins, and coordinators can use the location tracking app
        const allowedRoles = ['technician', 'senior_technician', 'admin', 'super_admin', 'coordinator'];
        if (!allowedRoles.includes(user.role)) {
            console.log(`Login denied: Role '${user.role}' not authorized for LocTrack`);
            return res.status(403).json({ error: 'This app is for technicians only. Please use the Service Hub dashboard.' });
        }

        // Check if password exists (some users might have NULL password)
        if (!user.password) {
            console.log(`Login failed: No password set for ${email}`);
            return res.status(401).json({ error: 'Account has no password set. Please set your password on Service Hub first.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            console.log(`Login attempt failed: Invalid password for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Split name for frontend compatibility
        const nameParts = (user.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const token = jwt.sign(
            { employeeId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`Login successful for ${email} (role: ${user.role}) - Unified Auth`);
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Verify Token
router.get('/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.sendStatus(403);

        try {
            // Check 'users' table
            const result = await pool.query(
                'SELECT id, email, name, role FROM users WHERE id = $1',
                [decoded.employeeId] // Token uses 'employeeId' as key for ID
            );

            if (result.rows.length === 0) return res.sendStatus(404);

            const user = result.rows[0];

            // Split name
            const nameParts = (user.name || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            res.json({
                employeeId: user.id,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                role: user.role
            });
        } catch (error) {
            console.error('Verify error:', error);
            res.sendStatus(500);
        }
    });
});

export default router;

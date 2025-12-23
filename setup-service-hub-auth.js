#!/usr/bin/env node

/**
 * Quick Setup Script for Service Hub Authentication
 * 
 * This script helps you quickly set up the authentication endpoints in Service Hub.
 * Run this from your Service Hub directory.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_HUB_AUTH_CODE = `import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

/**
 * POST /auth/login
 * Central authentication endpoint - validates credentials and issues JWT
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        console.log(\`🔐 Service Hub: Login attempt for \${email}\`);

        const result = await pool.query(
            \`SELECT employee_id, email, phone, first_name, last_name, role, password_hash, is_active 
             FROM employees 
             WHERE LOWER(email) = LOWER($1) OR phone = $1\`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (user.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled. Please contact your administrator.' });
        }

        if (!user.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await pool.query(
            'UPDATE employees SET last_login = CURRENT_TIMESTAMP WHERE employee_id = $1',
            [user.employee_id]
        );

        const token = jwt.sign(
            { 
                userId: user.employee_id,
                email: user.email,
                name: \`\${user.first_name} \${user.last_name}\`,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(\`✅ Login successful: \${email} (\${user.role})\`);

        res.json({
            token,
            user: {
                id: user.employee_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                name: \`\${user.first_name} \${user.last_name}\`,
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
 */
router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await pool.query(
            'SELECT employee_id, email, first_name, last_name, role, is_active FROM employees WHERE employee_id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.is_active === false) {
            return res.status(403).json({ error: 'Account is disabled' });
        }

        res.json({
            userId: user.employee_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            name: \`\${user.first_name} \${user.last_name}\`,
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

export default router;
`;

console.log('🚀 Service Hub Authentication Setup Helper\n');
console.log('This script will help you set up centralized authentication in Service Hub.\n');

console.log('📋 STEPS TO COMPLETE:\n');
console.log('1. Copy the auth.js code from SERVICE_HUB_AUTH_IMPLEMENTATION.md');
console.log('2. Create file: service-hub/server/routes/auth.js');
console.log('3. Paste the code into that file');
console.log('4. Update service-hub/server/index.js to mount the routes:');
console.log('   import authRoutes from \'./routes/auth.js\';');
console.log('   app.use(\'/auth\', authRoutes);');
console.log('5. Update service-hub/server/.env with:');
console.log('   JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==');
console.log('   PORT=5000\n');

console.log('✅ Once complete, test with:');
console.log('   curl -X POST http://localhost:5000/auth/login \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"email":"tech@test.com","password":"password123"}\'\n');

console.log('📚 For detailed instructions, see: SERVICE_HUB_AUTH_IMPLEMENTATION.md\n');

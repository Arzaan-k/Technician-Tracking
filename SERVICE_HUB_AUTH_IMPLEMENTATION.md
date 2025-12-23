# Service Hub Authentication Endpoints

## Instructions for Service Hub Integration

Copy the code below into your Service Hub application to enable centralized authentication.

---

## 1. Create `/server/routes/auth.js` in Service Hub

```javascript
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js'; // Adjust path to your database connection

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
```

---

## 2. Update Service Hub Main Server File

Add this to your `server/index.js` or `server/app.js`:

```javascript
import authRoutes from './routes/auth.js';

// ... other imports and middleware ...

// Mount auth routes
app.use('/auth', authRoutes);

// ... rest of your routes ...
```

---

## 3. Ensure Service Hub `.env` has JWT_SECRET

Add this to your Service Hub `.env` file:

```env
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
PORT=5000
DATABASE_URL=postgresql://neondb_owner:npg_ls7YTgzeoNA4@ep-young-grass-aewvokzj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**CRITICAL**: The `JWT_SECRET` must be IDENTICAL in both Service Hub and Technician Tracking!

---

## 4. Test the Endpoints

### Test Login:
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tech@test.com","password":"password123"}'
```

### Test Token Validation:
```bash
curl http://localhost:5000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 5. Dependencies Required

Ensure Service Hub has these dependencies:

```bash
npm install express bcrypt jsonwebtoken pg dotenv cors
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | Validate credentials, issue JWT |
| `/auth/me` | GET | Validate JWT, return user info |
| `/auth/user/:userId` | GET | Get user by ID (authenticated) |

---

## Security Notes

1. **JWT_SECRET must be kept secret** - never commit to git
2. **Both systems must use the SAME secret** for tokens to work
3. **Tokens expire after 24 hours** - users must re-login
4. **Disabled users are blocked immediately** - `is_active = false` prevents access
5. **All passwords are hashed with bcrypt** - never stored in plain text

---

## Integration Complete When:

- ✅ Service Hub has `/auth/login` and `/auth/me` endpoints
- ✅ Both systems have identical `JWT_SECRET` in `.env`
- ✅ Technician Tracking proxies login to Service Hub
- ✅ Tokens issued by Service Hub work in Technician Tracking
- ✅ Disabling a user in Service Hub blocks access everywhere

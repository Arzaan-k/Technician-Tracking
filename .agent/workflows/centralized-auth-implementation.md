---
description: Centralized Authentication Implementation Plan
---

# Centralized Authentication Between Service Hub and Technician Tracking

## Overview
Transform the current dual-authentication system into a centralized authentication architecture where Service Hub is the single source of truth for all users.

## Architecture Changes

### Service Hub (Authentication Provider)
- **Role**: Single source of truth for authentication
- **Responsibilities**:
  - Validate email/password using bcrypt
  - Issue JWT tokens containing userId, role, and name
  - Provide token validation endpoint
  - Manage user lifecycle (create, disable, delete)

### Technician Tracking (Authentication Consumer)
- **Role**: Proxy to Service Hub for authentication
- **Responsibilities**:
  - Forward login requests to Service Hub
  - Pass JWT tokens to frontend
  - Validate JWTs using shared secret
  - Enforce role-based access control
  - **NEVER** store passwords or generate JWTs

## Implementation Steps

### Phase 1: Service Hub Authentication Endpoints

1. **Create `/auth/login` endpoint in Service Hub**
   - Accept email/password
   - Validate against PostgreSQL using bcrypt
   - Issue JWT with payload: `{ userId, role, name, email }`
   - Use shared JWT_SECRET
   - Return: `{ token, user: { id, email, name, role } }`

2. **Create `/auth/me` endpoint in Service Hub**
   - Accept JWT in Authorization header
   - Validate token using shared JWT_SECRET
   - Check if user is still active in database
   - Return user info or 401/403 error

3. **Create `/auth/validate` endpoint in Service Hub**
   - Accept JWT token
   - Return validation status and decoded user info
   - Used by other systems to verify tokens

### Phase 2: Technician Tracking Authentication Proxy

1. **Remove local authentication logic**
   - Delete password validation code from `server/routes/auth.js`
   - Remove bcrypt password comparison
   - Remove JWT signing logic
   - Keep only JWT verification for protected routes

2. **Create Service Hub client module**
   - HTTP client to communicate with Service Hub
   - Methods: `login(email, password)`, `validateToken(token)`, `getUser(token)`
   - Handle network errors gracefully

3. **Update `/api/auth/login` to proxy to Service Hub**
   - Accept email/password from frontend
   - Forward to Service Hub `/auth/login`
   - Return Service Hub response directly to frontend
   - No local token generation

4. **Update `/api/auth/verify` to use local JWT validation**
   - Verify JWT using shared JWT_SECRET
   - Check user status in local database
   - Optionally call Service Hub for additional validation

### Phase 3: JWT Token Standardization

1. **Standardize JWT payload across both systems**
   ```json
   {
     "userId": 123,
     "email": "tech@example.com",
     "name": "John Doe",
     "role": "technician",
     "iat": 1703257200,
     "exp": 1703343600
   }
   ```

2. **Update middleware in Technician Tracking**
   - Change `req.user.employeeId` to `req.user.userId`
   - Update all route handlers to use new field names
   - Ensure backward compatibility during transition

3. **Update database queries**
   - Change all references from `employee_id` to use `technician_id` or keep as `employee_id`
   - Ensure `req.user.userId` maps correctly to database fields

### Phase 4: Role-Based Access Control

1. **Update authentication middleware**
   - Extract role from JWT
   - Enforce role-based access: only `technician` role can access tracking endpoints
   - Return 403 for unauthorized roles

2. **Update location tracking routes**
   - Verify user has `technician` role
   - Store tracking data using `technician_id = req.user.userId`
   - No mapping tables needed

### Phase 5: SSO Support (Optional)

1. **Accept JWT via URL parameter**
   - Check for `?token=<jwt>` in URL
   - Validate token and auto-login user
   - Redirect to dashboard
   - Enables seamless navigation from Service Hub to Tracking

2. **Update frontend to handle SSO**
   - Check URL for token on app load
   - Store token in localStorage
   - Redirect to dashboard if valid

### Phase 6: Security Enhancements

1. **Ensure JWT_SECRET is identical in both systems**
   - Document the shared secret requirement
   - Validate on startup that secret is configured

2. **Implement token revocation**
   - When user is disabled in Service Hub, token validation fails
   - Both systems check `is_active` status on every request
   - Immediate access revocation across all systems

3. **Add audit logging**
   - Log all authentication attempts
   - Log token validation failures
   - Track cross-system access

## Configuration Requirements

### Service Hub `.env`
```env
DATABASE_URL=postgresql://...
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
PORT=5000
NODE_ENV=production
```

### Technician Tracking `.env`
```env
DATABASE_URL=postgresql://...
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
SERVICE_HUB_URL=http://localhost:5000
PORT=3000
NODE_ENV=production
```

## Testing Checklist

- [ ] Service Hub login endpoint works
- [ ] Service Hub token validation works
- [ ] Technician Tracking proxies login to Service Hub
- [ ] JWT tokens work across both systems
- [ ] Disabled users cannot access either system
- [ ] Role-based access control works
- [ ] SSO via URL token works
- [ ] Token expiration is enforced
- [ ] Audit logs are created

## Migration Notes

- No data migration needed (same database)
- No password reset needed (passwords stay in database)
- Existing JWT tokens will become invalid (users must re-login)
- Frontend changes minimal (API contract stays same)

## Rollback Plan

If issues occur:
1. Revert Technician Tracking auth.js to original
2. Keep Service Hub endpoints (they don't break anything)
3. Both systems continue working independently

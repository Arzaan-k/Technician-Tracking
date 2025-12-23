# 🔐 Centralized Authentication System

## Overview

This implementation transforms the Technician Tracking and Service Hub applications into a **centralized authentication architecture** where **Service Hub acts as the single source of truth** for all user authentication.

---

## 🎯 Quick Links

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[QUICK_START.md](QUICK_START.md)** | Get started in 5 minutes | 5 min |
| **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** | High-level overview | 10 min |
| **[SERVICE_HUB_AUTH_IMPLEMENTATION.md](SERVICE_HUB_AUTH_IMPLEMENTATION.md)** | Service Hub code & setup | 15 min |
| **[CENTRALIZED_AUTH_COMPLETE.md](CENTRALIZED_AUTH_COMPLETE.md)** | Complete technical guide | 30 min |
| **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** | Visual architecture | 10 min |

---

## ⚡ Quick Start

### 1. Update Technician Tracking `.env`
```env
SERVICE_HUB_URL=http://localhost:5000
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
```

### 2. Add Auth Routes to Service Hub
See **[SERVICE_HUB_AUTH_IMPLEMENTATION.md](SERVICE_HUB_AUTH_IMPLEMENTATION.md)** for complete code.

### 3. Update Service Hub `.env`
```env
JWT_SECRET=TUSKTSJZzG4ApvclLN6nFU78oCpl8vORSEW0qDia06wu9WPv7pEKrsX2ZcH7QITNcpgKM2cbvOFRzqQAPSWSg==
PORT=5000
```

### 4. Test It Works
```bash
# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tech@test.com","password":"password123"}'
```

---

## ✅ What You Get

- ✅ **Single Sign-On** - One login works everywhere
- ✅ **Immediate Revocation** - Disable user once, blocks all systems
- ✅ **Role-Based Access** - Only technicians can track
- ✅ **Zero Duplicate Passwords** - Service Hub is the only source
- ✅ **Consistent Tokens** - Same JWT across all systems

---

## 🏗️ Architecture

```
Frontend → Technician Tracking (Proxy) → Service Hub (Auth Source)
                    ↓                            ↓
              PostgreSQL Database (Shared - Single Source)
```

**Key Principle**: Service Hub validates passwords and issues JWTs. Technician Tracking proxies authentication requests and validates JWTs using a shared secret.

---

## 📦 Implementation Status

### Technician Tracking ✅ COMPLETE
- ✅ Service Hub client module
- ✅ Authentication proxy routes
- ✅ JWT validation middleware
- ✅ Role-based access control
- ✅ Updated location routes
- ✅ Configuration updated

### Service Hub ⏳ PENDING
- ⏳ Authentication endpoints (code provided)
- ⏳ JWT_SECRET configuration
- ⏳ Route mounting

---

## 🔐 Security Features

1. **Single Source of Truth** - Only Service Hub validates passwords
2. **Immediate Revocation** - Database check on every request
3. **Role-Based Access** - Middleware enforces technician-only
4. **Shared Secret** - Both systems use same JWT_SECRET
5. **No Password Storage** - Technician Tracking never sees passwords
6. **No Token Generation** - Technician Tracking never creates JWTs

---

## 📚 Documentation Structure

```
📁 Centralized Authentication Documentation
│
├── 📄 README_CENTRALIZED_AUTH.md (this file)
│   └── Index and quick reference
│
├── 📄 QUICK_START.md
│   └── 5-minute setup guide
│
├── 📄 EXECUTIVE_SUMMARY.md
│   └── High-level overview for stakeholders
│
├── 📄 SERVICE_HUB_AUTH_IMPLEMENTATION.md
│   └── Complete Service Hub code and instructions
│
├── 📄 CENTRALIZED_AUTH_COMPLETE.md
│   └── Comprehensive technical guide
│
├── 📄 ARCHITECTURE_DIAGRAM.md
│   └── Visual architecture diagrams
│
└── 📁 .agent/workflows/
    └── 📄 centralized-auth-implementation.md
        └── Detailed implementation plan
```

---

## 🚀 Getting Started

### For Developers
1. Read **[QUICK_START.md](QUICK_START.md)** (5 minutes)
2. Implement Service Hub endpoints using **[SERVICE_HUB_AUTH_IMPLEMENTATION.md](SERVICE_HUB_AUTH_IMPLEMENTATION.md)** (15 minutes)
3. Test the integration (10 minutes)

### For Technical Leads
1. Read **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** (10 minutes)
2. Review **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** (10 minutes)
3. Approve implementation plan

### For DevOps
1. Review **[CENTRALIZED_AUTH_COMPLETE.md](CENTRALIZED_AUTH_COMPLETE.md)** security section
2. Ensure `JWT_SECRET` is configured identically in both systems
3. Verify both systems can communicate (network/firewall)

---

## 🔄 Authentication Flow

### Login
```
User → Tracking → Service Hub → Database
                      ↓
                  Validate
                      ↓
                 Generate JWT
                      ↓
User ← Tracking ← Service Hub
```

### Protected Request
```
User → Tracking → Validate JWT → Check is_active → Enforce role → Process
```

### Access Revocation
```
Admin → Service Hub → Update is_active = false → Database
                                                      ↓
User → Tracking → Validate JWT → Check is_active → 403 Denied
```

---

## 📊 JWT Token Format

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

**Issuer**: Service Hub only  
**Validator**: Both systems (shared secret)  
**Expiry**: 24 hours

---

## ✅ Testing Checklist

- [ ] Service Hub `/auth/login` works
- [ ] Service Hub `/auth/me` works
- [ ] Both systems have identical `JWT_SECRET`
- [ ] Login via Technician Tracking works (proxied)
- [ ] JWT tokens work across both systems
- [ ] Only technicians can access tracking
- [ ] Disabled users cannot access either system

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Service Hub unreachable" | Check Service Hub is running on port 5000 |
| "Invalid token" | Verify JWT_SECRET is IDENTICAL in both .env files |
| "Technician access required" | User role must be 'technician' in database |
| "Account disabled" | Set is_active = true in employees table |

See **[CENTRALIZED_AUTH_COMPLETE.md](CENTRALIZED_AUTH_COMPLETE.md)** for detailed troubleshooting.

---

## ⚠️ Critical Requirements

1. **JWT_SECRET must be IDENTICAL** in both systems
2. **Service Hub must be running** for login to work
3. **Only technicians can access tracking** endpoints
4. **Never commit `.env` files** to git

---

## 📞 Support

For issues or questions:
1. Check **[QUICK_START.md](QUICK_START.md)** troubleshooting
2. Review **[CENTRALIZED_AUTH_COMPLETE.md](CENTRALIZED_AUTH_COMPLETE.md)** detailed guide
3. Verify configuration in both `.env` files
4. Check server logs for errors

---

## 🎉 Benefits

1. **Single Source of Truth** - Service Hub only
2. **Zero Duplicate Users** - Shared database
3. **Zero Duplicate Passwords** - Validated once
4. **Immediate Revocation** - Instant access blocking
5. **Role-Based Access** - Technician-only tracking
6. **SSO Ready** - Seamless navigation
7. **Audit Trail** - All auth through Service Hub

---

## 📝 Files Modified

### Technician Tracking (Complete)
- `server/serviceHubClient.js` - NEW
- `server/routes/auth.js` - REPLACED
- `server/middleware/auth.js` - UPDATED
- `server/routes/location.js` - UPDATED
- `server/package.json` - UPDATED
- `server/env.example.txt` - UPDATED

### Service Hub (Pending)
- `server/routes/auth.js` - NEW (code provided)
- `server/index.js` - UPDATE (mount routes)
- `server/.env` - UPDATE (add JWT_SECRET)

---

## 🚦 Next Steps

1. **Read** [QUICK_START.md](QUICK_START.md)
2. **Implement** Service Hub endpoints
3. **Configure** both `.env` files
4. **Test** the integration
5. **Deploy** to production

---

**Status**: ✅ Technician Tracking Complete | ⏳ Service Hub Pending

**Estimated Time**: 10-15 minutes to complete

**Ready to Deploy**: After Service Hub implementation and testing

---

🚀 **Start with [QUICK_START.md](QUICK_START.md) to get up and running in 5 minutes!**

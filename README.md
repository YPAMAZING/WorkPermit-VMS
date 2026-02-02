# Reliable Group MEP - Multi-System Platform

A comprehensive management platform combining **Work Permit System**, **MIS (Meter Information System)**, and **VMS (Visitor Management System)**. Each system has its own separate database for complete data isolation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v20+-green.svg)
![React](https://img.shields.io/badge/react-v18-blue.svg)

## 🚀 Live Preview

**URL**: https://3000-ixpax1uqdsifzsp0z1cc4-ad490db5.sandbox.novita.ai

## 📦 Systems Overview

### 1. Work Permit System (Active)
- Create and manage work permits
- Approval workflows
- Worker registration with QR codes
- PDF generation

### 2. MIS - Meter Information System (Active - Separate DB)
- Meter readings and OCR capture
- Consumption analytics
- Transmitter data management
- Reports and exports

### 3. VMS - Visitor Management System (Coming Soon - Separate DB)
- QR code gatepasses
- Visitor pre-registration
- Blacklist/watchlist management
- Security dashboard

## 📂 Database Architecture

```
/home/user/webapp/backend/
├── prisma/
│   └── dev.db              ← Work Permit Database
├── prisma-mis/
│   └── mis.db              ← MIS Database (SEPARATE)
└── prisma-vms/
    └── vms.db              ← VMS Database (SEPARATE)
```

## 🔐 Default Login Credentials

### Work Permit System
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@permitmanager.com | admin123 |
| Fireman | fireman@permitmanager.com | fireman123 |
| Requestor | requestor@permitmanager.com | user123 |

### MIS System (Separate Database)
| Role | Email | Password |
|------|-------|----------|
| MIS Admin | misadmin@reliablegroup.com | Admin@123 |
| Site Engineer | engineer@reliablegroup.com | Admin@123 |
| MIS Verifier | verifier@reliablegroup.com | Admin@123 |

### VMS System (Separate Database) - Coming Soon
| Role | Email | Password |
|------|-------|----------|
| VMS Admin | vmsadmin@reliablegroup.com | Admin@123 |
| Security Guard | guard@reliablegroup.com | Admin@123 |
| Receptionist | reception@reliablegroup.com | Admin@123 |

## 🛣️ URL Structure

### Frontend Routes
| System | Route | Description |
|--------|-------|-------------|
| System Selector | `/select-system` | Choose between systems |
| Work Permit | `/workpermit/*` | Work Permit System |
| MIS | `/mis/*` | Meter Information System |
| VMS | `/vms/*` | Visitor Management System |

### API Endpoints
| System | Base Path | Database |
|--------|-----------|----------|
| Work Permit | `/api/*` | `prisma/dev.db` |
| MIS | `/api/mis/*` | `prisma-mis/mis.db` |
| VMS | `/api/vms/*` | `prisma-vms/vms.db` |

## 📊 MIS Features

### Completed
- ✅ Separate MIS database with Prisma
- ✅ MIS-specific roles (ADMIN, MIS_ADMIN, MIS_VERIFIER, SITE_ENGINEER, MIS_VIEWER, FIREMAN, SAFETY_OFFICER)
- ✅ MIS login page
- ✅ MIS dashboard layout
- ✅ MIS authentication routes
- ✅ Meter reading management API
- ✅ MIS analytics API

### MIS API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mis/auth/login` | Login to MIS |
| GET | `/api/mis/auth/me` | Get current user |
| GET | `/api/mis/dashboard/stats` | Dashboard statistics |
| GET | `/api/mis/dashboard/analytics` | Consumption analytics |
| GET | `/api/mis/meters/configs` | Get meter configurations |
| GET | `/api/mis/meters/readings` | Get meter readings |
| POST | `/api/mis/meters/readings` | Create reading |
| POST | `/api/mis/meters/readings/:id/verify` | Verify reading |

## 🎨 VMS Features (Planned)

### Implemented (Backend Ready)
- ✅ Separate VMS database with Prisma
- ✅ VMS-specific roles (VMS_ADMIN, SECURITY_GUARD, SECURITY_SUPERVISOR, RECEPTIONIST, HOST, VMS_VIEWER)
- ✅ VMS authentication routes
- ✅ Visitor management API
- ✅ Gatepass generation with QR codes
- ✅ Blacklist management API
- ✅ Pre-approved visitors API
- ✅ VMS dashboard API

### Pending (Frontend)
- ⏳ Complete VMS login flow
- ⏳ VMS dashboard UI
- ⏳ Visitor registration forms
- ⏳ Gatepass printing

## 🏗️ Architecture

### For Hostinger (MIS-only)
When deploying to Hostinger for MIS-only mode:
- Use `MISOnlySelector.jsx` as the landing page
- Only MIS routes and database
- Single centered card UI

### For New VPS (Work Permit + VMS)
- Use `SystemSelector.jsx` with both cards
- Work Permit database + VMS database
- Block-style card selection UI

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS, React Router |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (Prisma) - Separate DBs per system |
| **Auth** | JWT (JSON Web Tokens) |
| **Process Manager** | PM2 |

## 🚀 Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup databases
cd ../backend
npm run prisma:push && npm run prisma:seed  # Work Permit
npm run mis:push && npm run mis:seed        # MIS
npm run vms:push && npm run vms:seed        # VMS

# Build and start
cd ../frontend && npm run build
cd ..
pm2 start ecosystem.config.cjs
```

## 📋 Scripts

### Backend Scripts
```bash
# Work Permit Database
npm run prisma:push    # Push schema
npm run prisma:seed    # Seed data

# MIS Database
npm run mis:push       # Push schema
npm run mis:seed       # Seed data
npm run mis:studio     # Open Prisma Studio

# VMS Database
npm run vms:push       # Push schema
npm run vms:seed       # Seed data
npm run vms:studio     # Open Prisma Studio
```

## 📝 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=file:./prisma/dev.db
MIS_DATABASE_URL=file:./prisma-mis/mis.db
VMS_DATABASE_URL=file:./prisma-vms/vms.db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 🗂️ Project Structure

```
webapp/
├── backend/
│   ├── prisma/              # Work Permit schema & DB
│   ├── prisma-mis/          # MIS schema & DB
│   ├── prisma-vms/          # VMS schema & DB
│   └── src/
│       ├── config/
│       │   ├── index.js
│       │   ├── mis-prisma.js    # MIS Prisma client
│       │   └── vms-prisma.js    # VMS Prisma client
│       ├── controllers/
│       │   ├── mis/             # MIS controllers
│       │   └── vms/             # VMS controllers
│       ├── middleware/
│       │   ├── mis-auth.js      # MIS auth middleware
│       │   └── vms-auth.js      # VMS auth middleware
│       └── routes/
│           ├── mis/             # MIS routes
│           └── vms/             # VMS routes
├── frontend/
│   └── src/
│       ├── context/
│       │   ├── AuthContext.jsx      # Work Permit auth
│       │   ├── MISAuthContext.jsx   # MIS auth
│       │   └── VMSAuthContext.jsx   # VMS auth
│       ├── pages/
│       │   ├── mis/                 # MIS pages
│       │   ├── vms/                 # VMS pages
│       │   ├── SystemSelector.jsx   # Multi-system selector
│       │   └── MISOnlySelector.jsx  # MIS-only selector
│       └── services/
│           ├── api.js               # Work Permit API
│           ├── misApi.js            # MIS API
│           └── vmsApi.js            # VMS API
└── ecosystem.config.cjs            # PM2 config
```

## 📅 Last Updated

**Date**: 2026-02-01
**Status**: MIS database and auth complete, VMS backend complete, frontend in progress

---

**Built with ❤️ by YP Security Services Pvt Ltd**

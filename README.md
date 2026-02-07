# WorkPermit-VMS - Work Permit & Visitor Management System

A comprehensive management platform combining **Work Permit System** and **VMS (Visitor Management System)**. Each system has its own separate MySQL database for complete data isolation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v20+-green.svg)
![React](https://img.shields.io/badge/react-v18-blue.svg)
![MySQL](https://img.shields.io/badge/database-MySQL-orange.svg)

## 🚀 Systems Overview

### 1. Work Permit System ✅
- Create and manage work permits
- Multi-level approval workflows
- Worker registration with QR codes
- PDF generation & digital signatures
- Safety compliance tracking

### 2. VMS - Visitor Management System ✅
- QR code gatepasses
- Visitor pre-registration
- Blacklist/watchlist management
- Security dashboard
- Check-in/Check-out tracking

## 📦 Database Architecture (MySQL)

```
MySQL Server
├── workpermit_db          ← Work Permit Database
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── permit_requests
│   ├── permit_approvals
│   ├── permit_action_history
│   ├── workers
│   ├── audit_logs
│   └── system_settings
│
└── vms_db                 ← VMS Database (SEPARATE)
    ├── users
    ├── roles
    ├── permissions
    ├── visitors
    ├── gatepasses
    ├── pre_approved_visitors
    ├── blacklist_entries
    ├── audit_logs
    └── system_settings
```

## 🔐 Default Login Credentials

### Work Permit System
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@permitmanager.com | admin123 |
| Fireman | fireman@permitmanager.com | fireman123 |
| Requestor | requestor@permitmanager.com | user123 |

### VMS System
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
| VMS | `/vms/*` | Visitor Management System |

### API Endpoints
| System | Base Path | Database |
|--------|-----------|----------|
| Work Permit | `/api/*` | `workpermit_db` |
| VMS | `/api/vms/*` | `vms_db` |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TailwindCSS, React Router |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL 8.0 (via Prisma ORM) |
| **Auth** | JWT (JSON Web Tokens) |
| **Process Manager** | PM2 |
| **Web Server** | Nginx |

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 20+
- MySQL 8.0+
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/YPAMAZING/WorkPermit-VMS.git
cd WorkPermit-VMS
```

### 2. Setup MySQL Databases
```bash
# Login to MySQL
mysql -u root -p

# Run setup script
source scripts/mysql-setup.sql
```

Or manually:
```sql
CREATE DATABASE workpermit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE vms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'workpermit_user'@'localhost' IDENTIFIED BY 'YourPassword123!';
GRANT ALL PRIVILEGES ON workpermit_db.* TO 'workpermit_user'@'localhost';
GRANT ALL PRIVILEGES ON vms_db.* TO 'workpermit_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 4. Install Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 5. Setup Databases
```bash
cd backend

# Generate Prisma clients
npm run prisma:generate

# Push schemas and seed data
npm run db:setup
```

### 6. Start Development Server
```bash
# From project root
pm2 start ecosystem.config.cjs

# Or manually:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 7. Access Application
- Frontend: http://localhost:3000
- API: http://localhost:5000
- System Selector: http://localhost:3000/select-system

## 🌐 Production Deployment (Hostinger VPS)

### Recommended VPS: KVM 4
- 4 vCPU, 16 GB RAM, 200 GB NVMe
- Handles 300 concurrent users
- Cost: ~$12.99/month

### Quick Deploy
```bash
# 1. SSH into your VPS
ssh user@your-vps-ip

# 2. Run setup script
chmod +x scripts/hostinger-setup.sh
./scripts/hostinger-setup.sh

# 3. Clone and setup (follow script output)
git clone https://github.com/YPAMAZING/WorkPermit-VMS.git
cd WorkPermit-VMS
cp /tmp/workpermit-vms.env backend/.env

# 4. Install and build
cd backend && npm install
cd ../frontend && npm install && npm run build

# 5. Setup databases
cd ../backend && npm run db:setup

# 6. Start with PM2
cd .. && pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

# 7. Setup Nginx
sudo cp nginx/workpermit-vms.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/workpermit-vms.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 8. Setup SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 📋 Available Scripts

### Backend
```bash
npm start              # Start production server
npm run dev            # Start development server
npm run prisma:generate # Generate Prisma clients
npm run prisma:push    # Push Work Permit schema
npm run prisma:seed    # Seed Work Permit data
npm run vms:push       # Push VMS schema
npm run vms:seed       # Seed VMS data
npm run db:setup       # Setup both databases
npm run db:reset:all   # Reset all databases
```

### Frontend
```bash
npm run dev            # Start Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build
```

## 🗂️ Project Structure

```
WorkPermit-VMS/
├── backend/
│   ├── prisma/                 # Work Permit schema
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── prisma-vms/             # VMS schema (separate)
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── config/
│       ├── controllers/
│       │   └── vms/            # VMS controllers
│       ├── middleware/
│       │   └── vms-auth.js     # VMS auth middleware
│       └── routes/
│           └── vms/            # VMS routes
├── frontend/
│   └── src/
│       ├── context/
│       │   ├── AuthContext.jsx     # Work Permit auth
│       │   └── VMSAuthContext.jsx  # VMS auth
│       ├── pages/
│       │   ├── vms/                # VMS pages
│       │   └── SystemSelector.jsx  # System selector
│       └── services/
│           ├── api.js              # Work Permit API
│           └── vmsApi.js           # VMS API
├── nginx/
│   └── workpermit-vms.conf     # Nginx config
├── scripts/
│   ├── hostinger-setup.sh      # VPS setup script
│   └── mysql-setup.sql         # MySQL setup script
└── ecosystem.config.cjs        # PM2 config
```

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Separate databases per system
- Password hashing (bcrypt)
- CORS protection
- Rate limiting (Nginx)
- SQL injection prevention (Prisma ORM)
- XSS protection headers

## 📊 Database Access (GUI Tools)

### Option 1: phpMyAdmin (Web-based)
```bash
sudo apt install phpmyadmin
# Access via: https://yourdomain.com/phpmyadmin
```

### Option 2: DBeaver (Desktop)
- Download: https://dbeaver.io
- Connect with MySQL credentials
- Browse tables like file explorer

### Option 3: MySQL Workbench
- Download: https://dev.mysql.com/downloads/workbench/
- Official MySQL GUI tool

## 📅 Last Updated

**Date**: 2026-02-06
**Version**: 2.0.0 (MySQL Edition)
**Status**: Work Permit ✅ Active | VMS ✅ Active

---

**Built with ❤️ by YP Security Services Pvt Ltd**

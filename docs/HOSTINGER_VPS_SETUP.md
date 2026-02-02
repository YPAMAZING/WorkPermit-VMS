# MIS Work Permit System - Hostinger VPS Deployment Guide

## SQLite Edition (Simple & Easy)

**© 2025 YP SECURITY SERVICES PVT LTD. All Rights Reserved.**

---

## Why SQLite?

| Feature | SQLite |
|---------|--------|
| Setup | Zero configuration |
| Installation | Built into Node.js/Prisma |
| Backup | Simple file copy |
| Performance | Excellent for 100 users |
| Maintenance | None required |

**Perfect for:** Small to medium applications, up to 100+ concurrent users.

---

## Table of Contents

1. [VPS Requirements](#vps-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Install Required Software](#install-required-software)
4. [Clone & Setup Project](#clone--setup-project)
5. [Configure Application](#configure-application)
6. [Setup PM2](#setup-pm2)
7. [Configure Nginx](#configure-nginx)
8. [Setup SSL Certificate](#setup-ssl-certificate)
9. [Database Backup & Restore](#database-backup--restore)
10. [Maintenance Commands](#maintenance-commands)
11. [Troubleshooting](#troubleshooting)

---

## VPS Requirements

### Recommended: Hostinger KVM 2

| Specification | Recommended |
|---------------|-------------|
| vCPU | 2 cores |
| RAM | 8 GB |
| Storage | 100 GB NVMe SSD |
| OS | **Ubuntu 22.04 LTS (Plain, No Panel)** |
| Bandwidth | 8 TB |
| Price | ~$8-12/month |

---

## Initial Server Setup

### 1. Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Set Timezone

```bash
timedatectl set-timezone Asia/Kolkata
```

### 4. Configure Firewall

```bash
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw enable
```

---

## Install Required Software

### Install All Required Packages

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Git & Nginx
apt install -y git nginx

# Verify installations
node -v     # Should show v20.x.x
npm -v      # Should show 10.x.x
pm2 -v      # Should show 5.x.x
nginx -v    # Should show nginx/1.x.x
```

---

## Clone & Setup Project

### 1. Create Directory & Clone

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/YPAMAZING/MIS-Work-Pemit.git
cd MIS-Work-Pemit
```

### 2. Setup Backend

```bash
cd backend
npm install
```

### 3. Configure Environment

```bash
# Copy example file
cp .env.example .env

# Edit configuration
nano .env
```

**Update .env with these settings:**
```env
# Database (SQLite - auto-created)
DATABASE_URL="file:./prisma/dev.db"

# JWT - Generate secure key (see below)
JWT_SECRET="YOUR_64_CHARACTER_SECRET_KEY"
JWT_EXPIRES_IN="24h"

# Server
PORT=5000
NODE_ENV=production

# Frontend URL
FRONTEND_URL="http://YOUR_DOMAIN_OR_IP"
```

### 4. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste into JWT_SECRET in .env file.

### 5. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Create database and tables
npx prisma db push

# Seed demo data
npm run prisma:seed
```

### 6. Setup Frontend

```bash
cd ../frontend
npm install
npm run build
```

---

## Setup PM2

### 1. Return to Project Root

```bash
cd /var/www/MIS-Work-Pemit
```

### 2. Start Services

```bash
pm2 start ecosystem.config.cjs
```

### 3. Save Configuration

```bash
pm2 save
```

### 4. Setup Startup Script

```bash
pm2 startup
# Run the command that PM2 outputs (copy & paste it)
```

### 5. Verify Services

```bash
pm2 list
pm2 logs --nostream
```

---

## Configure Nginx

### 1. Create Configuration

```bash
nano /etc/nginx/sites-available/workpermit
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend - React App
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout for OCR processing
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Max upload size for meter images
    client_max_body_size 10M;
}
```

**Replace `YOUR_DOMAIN_OR_IP` with your actual domain or VPS IP.**

### 2. Enable Site

```bash
# Create symlink
ln -s /etc/nginx/sites-available/workpermit /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## Setup SSL Certificate (If You Have Domain)

### 1. Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 2. Get Certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Auto-Renewal Test

```bash
certbot renew --dry-run
```

---

## Database Backup & Restore

### Create Backup Directory

```bash
mkdir -p /var/www/MIS-Work-Pemit/backups
```

### Manual Backup

```bash
# Simple copy
cp /var/www/MIS-Work-Pemit/backend/prisma/dev.db /var/www/MIS-Work-Pemit/backups/backup_$(date +%Y%m%d).db

# Or use the backup script
/var/www/MIS-Work-Pemit/scripts/backup-database.sh
```

### Automatic Daily Backups

```bash
# Make script executable
chmod +x /var/www/MIS-Work-Pemit/scripts/backup-database.sh

# Edit crontab
crontab -e

# Add this line (backup at 2 AM daily)
0 2 * * * /var/www/MIS-Work-Pemit/scripts/backup-database.sh >> /var/www/MIS-Work-Pemit/backups/cron.log 2>&1
```

### Download Backup to Your Computer

**Using SCP (from your local computer):**
```bash
scp root@YOUR_VPS_IP:/var/www/MIS-Work-Pemit/backups/*.db.gz ./my_backups/
```

**Using FileZilla:**
1. Connect to your VPS via SFTP
2. Navigate to `/var/www/MIS-Work-Pemit/backups/`
3. Download the backup files

### Restore from Backup

```bash
# Using restore script
/var/www/MIS-Work-Pemit/scripts/restore-database.sh /path/to/backup.db.gz

# Or manual restore
pm2 stop all
gunzip -c /path/to/backup.db.gz > /var/www/MIS-Work-Pemit/backend/prisma/dev.db
pm2 restart all
```

---

## Maintenance Commands

### Application Management

```bash
# View status
pm2 list

# View logs
pm2 logs --nostream

# Restart all
pm2 restart all

# Restart specific service
pm2 restart permit-backend
pm2 restart permit-frontend
```

### Update Application

```bash
cd /var/www/MIS-Work-Pemit

# Backup database first
cp backend/prisma/dev.db backups/pre_update_$(date +%Y%m%d).db

# Pull latest code
git pull origin main

# Update backend
cd backend && npm install
npx prisma db push
npx prisma generate

# Update frontend
cd ../frontend && npm install && npm run build

# Restart services
pm2 restart all
```

### View Logs

```bash
# Application logs
pm2 logs --nostream

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs permit-backend --lines 50

# Check if database exists
ls -la /var/www/MIS-Work-Pemit/backend/prisma/dev.db

# Recreate database if needed
cd /var/www/MIS-Work-Pemit/backend
npx prisma db push
npm run prisma:seed
pm2 restart all
```

### Nginx Errors

```bash
# Test configuration
nginx -t

# Check error log
tail -50 /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### Memory Issues

```bash
# Check memory usage
free -h

# Check PM2 memory
pm2 monit

# Restart services
pm2 restart all
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@permitmanager.com | admin123 |
| Safety Officer | safety@permitmanager.com | safety123 |
| Requestor | requestor@permitmanager.com | user123 |
| Site Engineer | engineer@permitmanager.com | engineer123 |

**⚠️ Change these passwords in production!**

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| View services | `pm2 list` |
| View logs | `pm2 logs --nostream` |
| Restart all | `pm2 restart all` |
| Backup database | `cp backend/prisma/dev.db backups/backup_$(date +%Y%m%d).db` |
| Update app | `git pull && cd backend && npm install && cd ../frontend && npm install && npm run build && pm2 restart all` |

---

## Security Checklist

- [ ] Changed JWT_SECRET to strong random key
- [ ] Changed/removed demo account passwords
- [ ] Enabled UFW firewall
- [ ] Setup SSL certificate (if using domain)
- [ ] Configured automatic backups
- [ ] Tested backup & restore process

---

## Support

**YP SECURITY SERVICES PVT LTD**  
© 2025 All Rights Reserved.

---

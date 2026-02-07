# VPS Deployment Guide - WorkPermit-VMS

## Prerequisites
- Hostinger VPS with Ubuntu 22.04/24.04
- Root or sudo access
- Domain name (optional but recommended)

---

## Step 1: Initial Server Setup

SSH into your VPS:
```bash
ssh root@YOUR_VPS_IP
```

Update system:
```bash
apt update && apt upgrade -y
```

Install required packages:
```bash
apt install -y curl git nginx mysql-server certbot python3-certbot-nginx
```

---

## Step 2: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
npm install -g pm2
```

Verify:
```bash
node -v  # Should show v20.x
npm -v
pm2 -v
```

---

## Step 3: Setup MySQL Database

Secure MySQL:
```bash
mysql_secure_installation
```

Create databases and user:
```bash
mysql -u root -p
```

```sql
-- Create databases
CREATE DATABASE workpermit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE workpermit_vms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (CHANGE PASSWORD!)
CREATE USER 'workpermit_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON workpermit_db.* TO 'workpermit_user'@'localhost';
GRANT ALL PRIVILEGES ON workpermit_vms_db.* TO 'workpermit_user'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

---

## Step 4: Clone and Setup Application

Create app directory:
```bash
mkdir -p /var/www
cd /var/www
```

Clone repository:
```bash
git clone https://github.com/YPAMAZING/WorkPermit-VMS.git
cd WorkPermit-VMS
```

---

## Step 5: Configure Environment Variables

Create backend .env:
```bash
nano backend/.env
```

```env
# Server
NODE_ENV=production
PORT=5000

# MySQL Database URLs
DATABASE_URL=mysql://workpermit_user:YourStrongPassword123!@localhost:3306/workpermit_db
VMS_DATABASE_URL=mysql://workpermit_user:YourStrongPassword123!@localhost:3306/workpermit_vms_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRES_IN=24h

# Frontend URL (update with your domain)
FRONTEND_URL=https://yourdomain.com
```

---

## Step 6: Update Prisma Schemas for MySQL

### Main schema (backend/prisma/schema.prisma):
Change the datasource:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### VMS schema (backend/prisma-vms/schema.prisma):
Change the datasource:
```prisma
datasource db {
  provider = "mysql"
  url      = env("VMS_DATABASE_URL")
}
```

---

## Step 7: Install Dependencies & Build

Backend:
```bash
cd /var/www/WorkPermit-VMS/backend
npm install
npx prisma generate
npx prisma generate --schema=prisma-vms/schema.prisma
npx prisma db push
npx prisma db push --schema=prisma-vms/schema.prisma
node prisma-vms/seed.js
```

Frontend:
```bash
cd /var/www/WorkPermit-VMS/frontend
npm install
npm run build
```

---

## Step 8: Configure Nginx

Create Nginx config:
```bash
nano /etc/nginx/sites-available/workpermit-vms
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain or IP

    # Frontend (React)
    location / {
        root /var/www/WorkPermit-VMS/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/WorkPermit-VMS/frontend/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/workpermit-vms /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site
nginx -t
systemctl restart nginx
```

---

## Step 9: Start Application with PM2

```bash
cd /var/www/WorkPermit-VMS
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

---

## Step 10: Setup SSL (HTTPS) - Optional but Recommended

If you have a domain:
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Step 11: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## Useful Commands

### PM2 Commands:
```bash
pm2 list                    # List all processes
pm2 logs                    # View logs
pm2 restart all             # Restart all
pm2 stop all                # Stop all
pm2 delete all              # Delete all
```

### Update Application:
```bash
cd /var/www/WorkPermit-VMS
git pull origin main
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart all
```

### View Logs:
```bash
pm2 logs workpermit-vms-api --lines 100
pm2 logs workpermit-vms-frontend --lines 100
```

---

## URLs After Deployment

| Feature | URL |
|---------|-----|
| **Main System** | https://yourdomain.com |
| **Single QR Check-in** | https://yourdomain.com/vms/checkin |
| **Open VMS Dashboard** | https://yourdomain.com/vms |
| **Company Portal** | https://yourdomain.com/vms/portal/P-RELIABLE1 |
| **Work Permit System** | https://yourdomain.com/workpermit |
| **VMS Admin** | https://yourdomain.com/vms/admin |

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | vmsadmin@reliablegroup.com | Admin@123 |
| Reliable Guard | guard@reliablegroup.com | Admin@123 |
| TechPark Guard | guard@techpark.com | Admin@123 |

**⚠️ IMPORTANT: Change these passwords immediately after first login!**

---

## Company Portal IDs

| Company | Portal ID | Subscription |
|---------|-----------|--------------|
| Reliable Group MEP | P-RELIABLE1 | ON |
| TechPark Tower | P-TECHPARK1 | ON |
| Business Centre Plaza | P-BIZCENTRE1 | OFF |

---

## Troubleshooting

### Check if services are running:
```bash
pm2 list
systemctl status nginx
systemctl status mysql
```

### Check ports:
```bash
netstat -tlnp | grep -E '(3000|5000|80|443)'
```

### MySQL connection issues:
```bash
mysql -u workpermit_user -p -e "SHOW DATABASES;"
```

### Nginx issues:
```bash
nginx -t
tail -f /var/log/nginx/error.log
```

### Application logs:
```bash
pm2 logs --lines 200
```

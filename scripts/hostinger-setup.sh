#!/bin/bash

# ================================================================
# Hostinger VPS Setup Script for WorkPermit-VMS
# MySQL Edition - Work Permit + VMS Systems
# ================================================================

echo "=============================================="
echo "  WorkPermit-VMS Hostinger VPS Setup Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ================================================================
# STEP 1: Update System
# ================================================================
echo -e "${BLUE}[1/8] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# ================================================================
# STEP 2: Install Node.js 20 LTS
# ================================================================
echo -e "${BLUE}[2/8] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

# ================================================================
# STEP 3: Install MySQL Server
# ================================================================
echo -e "${BLUE}[3/8] Installing MySQL Server...${NC}"
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# ================================================================
# STEP 4: Setup MySQL Databases and User
# ================================================================
echo -e "${BLUE}[4/8] Setting up MySQL databases...${NC}"

# Generate random password
DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)

echo -e "${YELLOW}Generated MySQL password: ${DB_PASSWORD}${NC}"
echo -e "${YELLOW}SAVE THIS PASSWORD!${NC}"

# Create databases and user
sudo mysql << EOF
-- Create databases
CREATE DATABASE IF NOT EXISTS workpermit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS vms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with password
CREATE USER IF NOT EXISTS 'workpermit_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS 'workpermit_user'@'%' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON workpermit_db.* TO 'workpermit_user'@'localhost';
GRANT ALL PRIVILEGES ON workpermit_db.* TO 'workpermit_user'@'%';
GRANT ALL PRIVILEGES ON vms_db.* TO 'workpermit_user'@'localhost';
GRANT ALL PRIVILEGES ON vms_db.* TO 'workpermit_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'workpermit_user';
EOF

echo -e "${GREEN}✅ MySQL databases created successfully${NC}"

# ================================================================
# STEP 5: Install PM2
# ================================================================
echo -e "${BLUE}[5/8] Installing PM2 Process Manager...${NC}"
sudo npm install -g pm2

# ================================================================
# STEP 6: Install Nginx
# ================================================================
echo -e "${BLUE}[6/8] Installing Nginx...${NC}"
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# ================================================================
# STEP 7: Setup Firewall
# ================================================================
echo -e "${BLUE}[7/8] Configuring firewall...${NC}"
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3306/tcp    # MySQL (for remote access if needed)
sudo ufw --force enable

# ================================================================
# STEP 8: Create Environment File Template
# ================================================================
echo -e "${BLUE}[8/8] Creating environment configuration...${NC}"

cat > /tmp/workpermit-vms.env << ENVFILE
# ================================
# WorkPermit-VMS Production Environment
# ================================

# Server
PORT=5000
NODE_ENV=production

# MySQL Database - Work Permit
DATABASE_URL=mysql://workpermit_user:${DB_PASSWORD}@localhost:3306/workpermit_db

# MySQL Database - VMS (Separate)
VMS_DATABASE_URL=mysql://workpermit_user:${DB_PASSWORD}@localhost:3306/vms_db

# JWT Authentication (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h

# Frontend URL (Update with your domain)
FRONTEND_URL=https://yourdomain.com
ENVFILE

echo -e "${GREEN}Environment template created at: /tmp/workpermit-vms.env${NC}"

# ================================================================
# SUMMARY
# ================================================================
echo ""
echo "=============================================="
echo -e "${GREEN}  SETUP COMPLETE!${NC}"
echo "=============================================="
echo ""
echo -e "${YELLOW}MySQL Credentials:${NC}"
echo "  Username: workpermit_user"
echo "  Password: ${DB_PASSWORD}"
echo "  Databases: workpermit_db, vms_db"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Clone your repository:"
echo "     git clone https://github.com/YPAMAZING/WorkPermit-VMS.git"
echo "     cd WorkPermit-VMS"
echo ""
echo "  2. Copy environment file:"
echo "     cp /tmp/workpermit-vms.env backend/.env"
echo ""
echo "  3. Install dependencies:"
echo "     cd backend && npm install"
echo "     cd ../frontend && npm install"
echo ""
echo "  4. Setup databases:"
echo "     cd ../backend"
echo "     npm run db:setup"
echo ""
echo "  5. Build frontend:"
echo "     cd ../frontend && npm run build"
echo ""
echo "  6. Start with PM2:"
echo "     cd .. && pm2 start ecosystem.config.cjs"
echo ""
echo "  7. Setup Nginx (see nginx.conf template)"
echo ""
echo "  8. Setup SSL with Let's Encrypt:"
echo "     sudo apt install certbot python3-certbot-nginx"
echo "     sudo certbot --nginx -d yourdomain.com"
echo ""
echo "=============================================="

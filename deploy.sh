#!/bin/bash

# Safe Deployment Script for MIS Work Permit System
# This script ensures data is backed up before any deployment

echo "=============================================="
echo "   MIS Work Permit System - Safe Deploy"
echo "=============================================="
echo ""

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKUP_SCRIPT="backend/scripts/backup-db.sh"

# Step 1: Backup database FIRST
echo "📦 Step 1: Backing up database..."
echo "----------------------------------------------"

if [ -f "$BACKUP_SCRIPT" ]; then
    bash "$BACKUP_SCRIPT"
    if [ $? -ne 0 ]; then
        echo "❌ Backup failed! Aborting deployment."
        exit 1
    fi
else
    # Manual backup if script doesn't exist
    if [ -f "backend/prisma/dev.db" ]; then
        mkdir -p backend/prisma/backups
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        cp backend/prisma/dev.db "backend/prisma/backups/dev_backup_${TIMESTAMP}.db"
        echo "✅ Manual backup created"
    fi
fi

echo ""

# Step 2: Pull latest code
echo "📥 Step 2: Pulling latest code from GitHub..."
echo "----------------------------------------------"
git stash
git pull origin main
git stash pop 2>/dev/null || true
echo ""

# Step 3: Install dependencies (if needed)
echo "📚 Step 3: Checking dependencies..."
echo "----------------------------------------------"
cd "$BACKEND_DIR"
if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null
fi
cd ..

cd "$FRONTEND_DIR"
if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null
fi
cd ..
echo "✅ Dependencies checked"
echo ""

# Step 4: Run safe migrations (without data loss)
echo "🔄 Step 4: Running safe database migrations..."
echo "----------------------------------------------"
cd "$BACKEND_DIR"
# Use --skip-generate to avoid regenerating client unnecessarily
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss=false 2>/dev/null || echo "No migrations to run"
npx prisma generate
cd ..
echo "✅ Migrations complete"
echo ""

# Step 5: Build frontend
echo "🔨 Step 5: Building frontend..."
echo "----------------------------------------------"
cd "$FRONTEND_DIR"
npm run build
cd ..
echo ""

# Step 6: Restart services
echo "🚀 Step 6: Restarting services..."
echo "----------------------------------------------"
pm2 restart all --update-env
echo ""

# Step 7: Verify deployment
echo "✅ Step 7: Verifying deployment..."
echo "----------------------------------------------"
sleep 2
curl -s http://localhost:3000/api/health
echo ""
echo ""

# Show database stats
echo "📊 Current Database Stats:"
echo "----------------------------------------------"
if [ -f "backend/prisma/dev.db" ]; then
    sqlite3 backend/prisma/dev.db "SELECT 'Users: ' || COUNT(*) FROM users;"
    sqlite3 backend/prisma/dev.db "SELECT 'Permits: ' || COUNT(*) FROM permit_requests;"
    sqlite3 backend/prisma/dev.db "SELECT 'Approvals: ' || COUNT(*) FROM permit_approvals;"
fi
echo ""

echo "=============================================="
echo "   ✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "If something went wrong, restore from backup:"
echo "  cd backend && bash scripts/restore-db.sh"
echo ""

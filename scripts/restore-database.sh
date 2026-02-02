#!/bin/bash

# ============================================
# SQLite Database Restore Script
# MIS Work Permit System
# YP SECURITY SERVICES PVT LTD © 2025
# ============================================

# Configuration
DB_PATH="${DB_PATH:-/var/www/MIS-Work-Pemit/backend/prisma/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/MIS-Work-Pemit/backups}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  SQLite Restore - MIS Work Permit${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check if backup file provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Available backups:${NC}"
    echo ""
    ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -10
    echo ""
    echo -e "${RED}Usage: $0 <backup_file>${NC}"
    echo "Example: $0 /var/www/MIS-Work-Pemit/backups/workpermit_backup_2025-01-10_09-00-00.db.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will overwrite the current database!${NC}"
echo "   Current database: $DB_PATH"
echo "   Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Restore cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Starting restore...${NC}"

# Stop application first
echo "   Stopping application..."
pm2 stop all 2>/dev/null || true

# Create backup of current database before restore
if [ -f "$DB_PATH" ]; then
    CURRENT_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).db"
    echo "   Backing up current database to: $CURRENT_BACKUP"
    cp "$DB_PATH" "$CURRENT_BACKUP"
fi

# Decompress and restore
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "   Decompressing backup..."
    gunzip -c "$BACKUP_FILE" > "$DB_PATH"
else
    echo "   Copying backup..."
    cp "$BACKUP_FILE" "$DB_PATH"
fi

# Restart application
echo "   Restarting application..."
pm2 restart all

echo ""
echo -e "${GREEN}✅ Restore completed successfully!${NC}"
echo "   Database restored from: $BACKUP_FILE"
echo "   Time: $(date)"
echo ""

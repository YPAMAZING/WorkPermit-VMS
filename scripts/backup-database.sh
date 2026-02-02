#!/bin/bash

# ============================================
# SQLite Database Backup Script
# MIS Work Permit System
# YP SECURITY SERVICES PVT LTD © 2025
# ============================================

# Configuration
DB_PATH="${DB_PATH:-/var/www/MIS-Work-Pemit/backend/prisma/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/MIS-Work-Pemit/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/workpermit_backup_$DATE.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}🔄 Starting SQLite backup...${NC}"
echo "   Database: $DB_PATH"
echo "   Time: $(date)"
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Database file not found: $DB_PATH${NC}"
    exit 1
fi

# Create backup
if cp "$DB_PATH" "$BACKUP_FILE"; then
    # Compress backup
    gzip "$BACKUP_FILE"
    
    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "   Backup file: $BACKUP_FILE.gz ($BACKUP_SIZE)"
    
    # Log backup
    echo "$(date): Backup created - workpermit_backup_$DATE.db.gz ($BACKUP_SIZE)" >> "$BACKUP_DIR/backup.log"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    echo "$(date): Backup FAILED" >> "$BACKUP_DIR/backup.log"
    exit 1
fi

# Cleanup old backups
echo ""
echo -e "${YELLOW}🧹 Cleaning up backups older than $RETENTION_DAYS days...${NC}"
find "$BACKUP_DIR" -name "workpermit_backup_*.db.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/workpermit_backup_*.db.gz 2>/dev/null | wc -l)
echo -e "${GREEN}   Kept $REMAINING backups${NC}"

echo ""
echo -e "${GREEN}🎉 Backup process completed!${NC}"
echo ""

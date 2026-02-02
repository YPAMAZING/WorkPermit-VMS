#!/bin/bash

# Database Restore Script for MIS Work Permit System
# This script restores the database from a backup file

# Configuration
DB_PATH="prisma/dev.db"
BACKUP_DIR="prisma/backups"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# If no argument provided, list available backups
if [ -z "$1" ]; then
    echo "📋 Available backups:"
    echo ""
    ls -lh "$BACKUP_DIR"/dev_backup_*.db 2>/dev/null | awk '{print NR". "$9" ("$5")"}'
    echo ""
    echo "Usage: ./restore-db.sh <backup_filename>"
    echo "Example: ./restore-db.sh dev_backup_20260116_120000.db"
    exit 0
fi

BACKUP_FILE="$BACKUP_DIR/$1"

# Check if specified backup exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Create a safety backup of current database before restore
if [ -f "$DB_PATH" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    SAFETY_BACKUP="$BACKUP_DIR/pre_restore_${TIMESTAMP}.db"
    echo "🔒 Creating safety backup of current database..."
    cp "$DB_PATH" "$SAFETY_BACKUP"
    echo "✅ Safety backup created: $SAFETY_BACKUP"
fi

# Restore from backup
echo "📦 Restoring from backup: $BACKUP_FILE"
cp "$BACKUP_FILE" "$DB_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "📋 Records after restore:"
    sqlite3 "$DB_PATH" "SELECT 'Users: ' || COUNT(*) FROM users;"
    sqlite3 "$DB_PATH" "SELECT 'Permits: ' || COUNT(*) FROM permit_requests;"
    sqlite3 "$DB_PATH" "SELECT 'Approvals: ' || COUNT(*) FROM permit_approvals;"
    sqlite3 "$DB_PATH" "SELECT 'Roles: ' || COUNT(*) FROM roles;"
    echo ""
    echo "✅ Database restored successfully!"
    echo ""
    echo "⚠️  Remember to restart the backend: pm2 restart permit-backend"
else
    echo "❌ Restore failed!"
    exit 1
fi

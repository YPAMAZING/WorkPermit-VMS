#!/bin/bash

# Database Backup Script for MIS Work Permit System
# This script creates timestamped backups of the SQLite database

# Configuration
DB_PATH="prisma/dev.db"
BACKUP_DIR="prisma/backups"
MAX_BACKUPS=30  # Keep last 30 backups

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at $DB_PATH"
    exit 1
fi

# Create backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/dev_backup_${TIMESTAMP}.db"

# Create backup
echo "📦 Creating backup..."
cp "$DB_PATH" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_FILE"
    
    # Get backup size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Backup size: $SIZE"
    
    # Count records in backup
    echo "📋 Records in backup:"
    sqlite3 "$BACKUP_FILE" "SELECT 'Users: ' || COUNT(*) FROM users;"
    sqlite3 "$BACKUP_FILE" "SELECT 'Permits: ' || COUNT(*) FROM permit_requests;"
    sqlite3 "$BACKUP_FILE" "SELECT 'Approvals: ' || COUNT(*) FROM permit_approvals;"
    sqlite3 "$BACKUP_FILE" "SELECT 'Roles: ' || COUNT(*) FROM roles;"
    
    # Cleanup old backups (keep only MAX_BACKUPS)
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/dev_backup_*.db 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        echo "🧹 Cleaning up old backups (keeping last $MAX_BACKUPS)..."
        ls -1t "$BACKUP_DIR"/dev_backup_*.db | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    fi
    
    echo ""
    echo "✅ Backup completed successfully!"
else
    echo "❌ Backup failed!"
    exit 1
fi

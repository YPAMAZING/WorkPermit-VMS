#!/bin/bash

# ============================================
# Auto-Update Script for MIS Work Permit System
# ============================================
# This script pulls latest changes from GitHub,
# rebuilds the frontend, and restarts services.
# ============================================

# Configuration - UPDATE THESE PATHS FOR YOUR VPS
PROJECT_DIR="/home/user/webapp"  # Change to your actual path on VPS
LOG_FILE="/home/user/webapp/logs/auto-update.log"
BRANCH="main"

# Create logs directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

# Timestamp for logging
timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

log() {
    echo "[$(timestamp)] $1" >> "$LOG_FILE"
}

# Start update process
log "========== Starting auto-update =========="

# Navigate to project directory
cd "$PROJECT_DIR" || {
    log "ERROR: Could not navigate to $PROJECT_DIR"
    exit 1
}

# Fetch latest changes
log "Fetching latest changes from origin/$BRANCH..."
git fetch origin $BRANCH 2>> "$LOG_FILE"

# Check if there are new changes
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "No new changes. Already up to date."
    log "========== Update check complete =========="
    exit 0
fi

log "New changes detected! Local: $LOCAL, Remote: $REMOTE"

# Pull latest changes
log "Pulling latest changes..."
git pull origin $BRANCH 2>> "$LOG_FILE"

if [ $? -ne 0 ]; then
    log "ERROR: Git pull failed"
    exit 1
fi

# Rebuild frontend
log "Rebuilding frontend..."
cd frontend
npm run build >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "ERROR: Frontend build failed"
    exit 1
fi

cd ..

# Restart PM2 services
log "Restarting PM2 services..."
pm2 restart all >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "ERROR: PM2 restart failed"
    exit 1
fi

# Log success
NEW_COMMIT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
log "SUCCESS: Updated to commit $NEW_COMMIT - $COMMIT_MSG"
log "========== Update complete =========="

exit 0

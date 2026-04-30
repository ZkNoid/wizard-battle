#!/bin/bash

# MongoDB Backup Script with Retention Policy

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_INITDB_ROOT_USERNAME="${MONGO_INITDB_ROOT_USERNAME}"
MONGO_INITDB_ROOT_PASSWORD="${MONGO_INITDB_ROOT_PASSWORD}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/mongodb_backup_$TIMESTAMP"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting MongoDB backup..."

# Perform the backup
if [ -n "$MONGO_INITDB_ROOT_USERNAME" ] && [ -n "$MONGO_INITDB_ROOT_PASSWORD" ]; then
  mongodump \
    --host "$MONGO_HOST:$MONGO_PORT" \
    --username "$MONGO_INITDB_ROOT_USERNAME" \
    --password "$MONGO_INITDB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --out "$BACKUP_PATH"
else
  mongodump \
    --host "$MONGO_HOST:$MONGO_PORT" \
    --out "$BACKUP_PATH"
fi

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully at $BACKUP_PATH"

  # Compress the backup
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Compressing backup..."
  cd "$BACKUP_DIR"
  tar -czf "mongodb_backup_$TIMESTAMP.tar.gz" "mongodb_backup_$TIMESTAMP"
  rm -rf "$BACKUP_PATH"

  # Create a marker file for healthcheck
  touch "$BACKUP_DIR/.last_backup_success"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Compressed backup: mongodb_backup_$TIMESTAMP.tar.gz"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed!"
  exit 1
fi

# Cleanup old backups (keep only last N days)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning up backups older than $BACKUP_KEEP_DAYS days..."
find "$BACKUP_DIR" -maxdepth 1 -name "mongodb_backup_*.tar.gz" -type f -mtime +"$BACKUP_KEEP_DAYS" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup process completed successfully"

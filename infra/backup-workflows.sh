#!/usr/bin/env bash
# Reference template: daily export of all n8n workflows to a private Git repo.
# Run from cron, e.g.:  0 6 * * *  /opt/n8n/backup-workflows.sh >> /var/log/n8n-backup.log 2>&1
#
# The backup repo is cloned at $BACKUP_DIR and pushes with a deploy key that
# has write access to that one repository only (see ~/.ssh/config Host alias).
# Credentials are never exported.
set -euo pipefail

COMPOSE_DIR=/opt/n8n
BACKUP_DIR=/opt/n8n-backup
EXPORT_IN_CONTAINER=/tmp/workflows

cd "$COMPOSE_DIR"
docker compose exec -T n8n rm -rf "$EXPORT_IN_CONTAINER"
docker compose exec -T n8n n8n export:workflow --all --separate --pretty --output="$EXPORT_IN_CONTAINER"

rm -rf "$BACKUP_DIR/workflows"
docker compose cp "n8n:$EXPORT_IN_CONTAINER" "$BACKUP_DIR/workflows"

cd "$BACKUP_DIR"
git add -A workflows
if git diff --cached --quiet; then
  echo "$(date -u +%FT%TZ) no workflow changes"
  exit 0
fi
git commit -m "Workflow backup $(date -u +%F)"
git push origin main
echo "$(date -u +%FT%TZ) backup pushed"

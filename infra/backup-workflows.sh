#!/usr/bin/env bash
# Illustrative example, not the script from the server. It shows the backup
# approach: export workflows to the mounted ./backup_export folder, commit,
# and push to a private repo using a repo-scoped deploy key.
# Assumes backup_export is a Git clone of that repo.
# Example cron entry:  0 6 * * *  /opt/n8n/backup-workflows.sh
set -euo pipefail

cd /opt/n8n
rm -f backup_export/*.json
docker compose exec -T n8n n8n export:workflow --all --separate --pretty --output=/backup

cd backup_export
git add -A
if git diff --cached --quiet; then
  echo "$(date -u +%FT%TZ) no workflow changes"
  exit 0
fi
git commit -m "Workflow backup $(date -u +%F)"
git push origin main

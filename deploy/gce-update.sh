#!/usr/bin/env bash
# Pull the latest code and restart the bots. Run from the repo root:  bash deploy/gce-update.sh
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

git pull --ff-only
pnpm install --frozen-lockfile --filter "./apps/bot-*..."
pm2 restart deploy/ecosystem.config.cjs --update-env
pm2 save
pm2 status

#!/usr/bin/env bash
# One-time setup for the Telegram bots on a fresh Ubuntu e2-micro (Google Cloud free tier).
# Run from the repo root after cloning:   bash deploy/gce-setup.sh
#
# Expects the three bot env files uploaded to your home directory first, named
#   ~/bot-customer.env  ~/bot-admin.env  ~/bot-rider.env
# (they're moved into apps/bot-*/.env — they never go into git).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Adding 2 GB swap (an e2-micro only has 1 GB of RAM)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Installing Node.js 22"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Enabling pnpm (via corepack) and installing pm2"
sudo corepack enable
sudo npm install -g pm2

echo "==> Placing bot env files"
for name in customer admin rider; do
  target="apps/bot-$name/.env"
  if [[ -f "$HOME/bot-$name.env" ]]; then
    mv "$HOME/bot-$name.env" "$target"
    chmod 600 "$target"
  elif [[ ! -f "$target" ]]; then
    echo "Missing ~/bot-$name.env (and no $target yet). Upload it, then re-run this script." >&2
    exit 1
  fi
done

echo "==> Installing dependencies for the bots only (skips the Next.js web app)"
pnpm install --frozen-lockfile --filter "./apps/bot-*..."

echo "==> Starting the bots under pm2"
pm2 start deploy/ecosystem.config.cjs
pm2 save
# Bring the bots back automatically after a server reboot.
sudo env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME"
pm2 save

echo
echo "Done. Check them with:  pm2 status   and   pm2 logs"

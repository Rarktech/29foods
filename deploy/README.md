# Hosting the Telegram bots on Google Cloud's free tier

The three bots (`bot-customer`, `bot-admin`, `bot-rider`) are long-running processes: they long-poll
Telegram, hold Supabase Realtime subscriptions, and run a once-a-minute sweeper. They need a server
that's always on, so serverless hosts don't fit. Google Cloud's free tier includes one `e2-micro` VM
(US regions only) plus a 30 GB standard disk, with no end date. All three bots run on it under pm2.

## 1. Create the VM (Google Cloud console)

1. Sign in at console.cloud.google.com and create a project (e.g. `29foods-bots`). You'll be asked to
   set up billing with a card — the free-tier VM isn't charged, but billing must be enabled.
2. **Compute Engine → VM instances → Create instance**:
   - **Region:** `us-central1` (Iowa), `us-west1` (Oregon) or `us-east1` (South Carolina) — only these are free.
   - **Machine type:** `e2-micro`.
   - **Boot disk:** Ubuntu 24.04 LTS, **Standard persistent disk**, 30 GB (not "Balanced" — that's billed).
   - **Firewall:** leave HTTP/HTTPS unticked. The bots only make outbound connections; nothing needs to reach them.
3. Create it, then click **SSH** next to the instance to open a terminal in the browser.

## 2. Get the code onto the server

```bash
git clone https://github.com/Rarktech/29foods.git
cd 29foods
```

(The repo is public, so no login is needed. If you make it private later, clone with a GitHub fine-grained
personal access token that has read-only *Contents* access to this repo.)

## 3. Upload the env files

On your PC, the three files are in `Desktop\29foods-server-env\` (`bot-customer.env`, `bot-admin.env`,
`bot-rider.env`). In the browser SSH window, use the **Upload file** button (top right) to upload all three.
They land in your home directory; the setup script moves them into place.

## 4. Stop the bots on your PC

Telegram only allows **one** long-polling copy of each bot. If your PC is still running them, the two copies
fight over updates and messages go missing. Stop them before the next step.

## 5. Run the setup script

```bash
bash deploy/gce-setup.sh
```

It adds swap, installs Node 22, pnpm and pm2, installs only the bots' dependencies (not the web app), starts
all three bots, and registers them to come back after a reboot. Afterwards:

```bash
pm2 status            # all three should say "online"
pm2 logs              # live logs (Ctrl+C to exit)
pm2 logs 29foods-customer --lines 100
```

## Deploying changes later

Push to GitHub from your PC, then on the server:

```bash
cd ~/29foods && bash deploy/gce-update.sh
```

## Notes

- **Migrations** aren't run by these scripts — apply new SQL in the Supabase SQL editor as before.
- **The Flutterwave webhook** lives in `apps/web` (Vercel), not here. Bot changes that touch payments may also
  need a Vercel redeploy.
- Free-tier egress is 1 GB/month from North America; three bots' Telegram/Supabase traffic sits well under that.
- Google can change the free tier with 30 days' notice — check the Billing page occasionally.

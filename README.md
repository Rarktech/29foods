# 29Foods

Campus food ordering — one Supabase backend, five front doors (customer web, customer/admin/rider Telegram bots, admin dashboard). See `29foods_prd.md` for the full product spec and the plan history for architecture decisions.

## Monorepo layout

```
apps/web            Next.js — customer app (/) + admin dashboard (/admin)
apps/bot-customer    Telegram — customer ordering (not yet built)
apps/bot-admin       Telegram — order management (not yet built)
apps/bot-rider       Telegram — delivery status (not yet built)
packages/core        Shared business logic (identity, inventory, orders, rider assignment, payments, QR)
packages/supabase-client  Server/browser/public Supabase clients + generated DB types
supabase/            SQL migrations + seed data
```

## Local setup

1. **Install dependencies** (from the repo root): `pnpm install`
2. **Supabase**
   - Create a project at supabase.com.
   - Authentication → Providers → enable Google, using an OAuth Client ID/Secret from Google Cloud Console (Authorized redirect URI is shown on that same dashboard screen — it's your Supabase project's `/auth/v1/callback` URL).
   - Copy the project URL, anon key, and service-role key into `apps/web/.env.local` (copy `.env.example` as a starting point).
   - Install the Supabase CLI, then from the repo root: `supabase link` (points the CLI at your project), `supabase db push` (applies `supabase/migrations/20260920000000_init_schema.sql`), and optionally `supabase db execute -f supabase/seed.sql` for sample menu items.
   - Regenerate types after any schema change: `supabase gen types typescript --linked > packages/supabase-client/src/types.generated.ts`.
   - Create your own admin account: sign up a Supabase Auth user (email+password, via the dashboard), then insert a matching row into `admin_profiles` with that user's `id` and `role = 'owner'`.
3. **Flutterwave** — create a (test) account, copy the public/secret keys into `.env.local`, and set a webhook secret hash in the Flutterwave dashboard matching `FLUTTERWAVE_WEBHOOK_HASH`.
4. **Run the web app**: `pnpm --filter @29foods/web dev` → http://localhost:3000
5. **Telegram bots** — create 3 bots via [@BotFather](https://t.me/BotFather) (customer, admin, rider), copy each token into the relevant `apps/bot-*/.env` (see `.env.example`). Message the admin bot once from the account that should receive pings, then get that chat's id (e.g. via `https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/getUpdates`) for `ADMIN_TELEGRAM_CHAT_ID`. Run locally with `pnpm --filter @29foods/bot-customer dev` (and `bot-admin`, `bot-rider` likewise) — each is a long-polling process, no webhook/tunnel needed for local dev.
6. **Riders** — rider rows aren't self-service; insert them directly (Supabase dashboard or a script) with the rider's `telegram_id` once they've messaged the rider bot once so you have that id.

## Deploying

- **`apps/web` → Vercel.** Set all web env vars in the Vercel project settings. `apps/web/vercel.json` schedules the stock-expiry sweep every 5 minutes — Vercel's Hobby plan only allows daily cron jobs, so on the free tier either upgrade to Pro or accept that abandoned/failed pending orders won't release their reserved stock until the next daily run (correctness is unaffected for successful payments either way).
- **`apps/bot-customer`, `apps/bot-admin`, `apps/bot-rider` → Railway** (or any host that runs a persistent Node process). Each is `pnpm --filter @29foods/bot-<name> start`, needs its own bot token env var plus the shared Supabase/Flutterwave vars. `bot-admin` also needs `TZ=Africa/Lagos` set so its 10pm daily summary lands at the right local time.

## Security notes

- All secrets live in `.env.local` files (gitignored) — never commit real credentials.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It's only ever used in server-side code (`apps/web/lib/supabase/service.ts`) — never imported into a Client Component.
- Every write to `orders`/`inventory` goes through the `SECURITY DEFINER` SQL functions in the migration (`create_order_with_reservation`, `mark_order_paid`, `release_order_stock`, `link_phone_merge`), not direct table writes — see the migration file's comments for why.

-- Web push notifications: subscriptions, persisted in-app notification history, and
-- a per-user preferences blob. Order-progress pushes (preparing/rider assigned/on the
-- way) are transient — driven live off the `orders` table itself, same as the existing
-- OrderStatusTracker realtime subscription — so only the final "delivered" milestone
-- gets a row here, alongside marketing/lifecycle notifications.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in (
    'order_delivered', 'deal', 'menu_drop', 'loyalty', 'cart_reminder',
    'plan_renew', 'plan_expired', 'referral', 'winback'
  )),
  title text not null,
  body text not null,
  href text,
  thumb_url text,
  order_id uuid references orders(id),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_id_created_idx on notifications(user_id, created_at desc);

alter table users add column notification_prefs jsonb not null default '{
  "riderMsg": true, "delivered": true,
  "flash": true, "menuDrop": true,
  "planRenew": true, "planTomorrow": false,
  "cartNudge": true, "winback": false,
  "points": true, "referral": true,
  "push": true, "sms": false,
  "quiet": true, "quietFrom": "22:00", "quietTo": "07:00"
}'::jsonb;

alter table push_subscriptions enable row level security;
alter table notifications enable row level security;

create policy "push_subscriptions select own" on push_subscriptions for select
  using (auth.uid() = (select auth_uid from users where users.id = push_subscriptions.user_id));
-- insert/delete/update go through server-side API routes (service role) so a client
-- can never plant a subscription against another user's id — no client write policy.

create policy "notifications select own" on notifications for select
  using (auth.uid() = (select auth_uid from users where users.id = notifications.user_id));
-- marking read goes through a server route too, same reasoning as push_subscriptions.

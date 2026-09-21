-- Meal-subscription "Plans" feature. Subscriptions are a one-time PREPAID
-- bundle (charged once via the same Flutterwave standard-checkout flow used
-- for regular orders) — not recurring/tokenized billing, which this codebase
-- has no infrastructure for. A daily cron later "spends" the prepaid balance
-- by generating ordinary `orders` rows (see the subscription_id FK below), so
-- every existing surface — admin dashboard, rider bot, live tracking, feedback,
-- loyalty — works for subscription deliveries with zero changes to those surfaces.

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  duration_id text not null check (duration_id in ('1_week', '2_weeks', '1_month')),
  num_weeks integer not null check (num_weeks in (1, 2, 4)),
  lodge text not null,
  room text,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'completed', 'cancelled')),
  food_subtotal integer not null check (food_subtotal >= 0),   -- kobo
  delivery_total integer not null check (delivery_total >= 0), -- kobo
  total_paid integer not null check (total_paid >= 0),         -- kobo
  deliveries_total integer not null check (deliveries_total >= 0),
  deliveries_used integer not null default 0 check (deliveries_used >= 0),
  flutterwave_tx_ref text unique,
  flutterwave_tx_id text,
  expires_at timestamptz,      -- pending-payment sweep deadline, same pattern as orders.expires_at
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz
);
create index subscriptions_user_id_idx on subscriptions(user_id);
create index subscriptions_active_idx on subscriptions(status) where status = 'active';
create index subscriptions_pending_expiry_idx on subscriptions(expires_at) where status = 'pending_payment';

create table subscription_slots (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  meal_time text not null check (meal_time in ('breakfast', 'lunch', 'dinner')),
  addon_enabled boolean not null default false,
  addon_label text,
  addon_price_kobo integer,     -- snapshot from PLAN_SLOT_ADDONS at purchase time
  unique (subscription_id, meal_time)
);

-- Plan dishes are a deliberately separate, bulk/subscription-priced catalog from
-- menu_items (e.g. "Ofada Special" is ~44% cheaper per serving in a plan than
-- a la carte) — dish_key identifies a row in packages/core's PLAN_DISH_CATALOG
-- constant, not a menu_items FK.
create table subscription_slot_dishes (
  id uuid primary key default gen_random_uuid(),
  subscription_slot_id uuid not null references subscription_slots(id) on delete cascade,
  dish_key text not null,
  dish_name text not null,
  frequency_per_week integer not null check (frequency_per_week between 1 and 7),
  unit_price_kobo integer not null check (unit_price_kobo >= 0), -- snapshot from PLAN_DISH_CATALOG at purchase time
  scheduled_weekdays integer[] not null default '{}'             -- 0=Sun..6=Sat, assigned once at purchase
);
create index subscription_slot_dishes_slot_idx on subscription_slot_dishes(subscription_slot_id);

-- Subscription-generated deliveries are ordinary orders, just tagged with where they came from.
alter table orders add column subscription_id uuid references subscriptions(id);
create index orders_subscription_id_idx on orders(subscription_id) where subscription_id is not null;

-- ============================================================================
-- Row Level Security — same shape as orders: select-your-own (via auth_uid
-- join), admin-all, no client write policies (writes only via the RPCs below).
-- ============================================================================

alter table subscriptions enable row level security;
alter table subscription_slots enable row level security;
alter table subscription_slot_dishes enable row level security;

create policy "subscriptions select own" on subscriptions for select
  using (auth.uid() = (select auth_uid from users where users.id = subscriptions.user_id));
create policy "subscriptions admin all" on subscriptions for all using (is_admin()) with check (is_admin());

create policy "subscription_slots select own" on subscription_slots for select
  using (exists (
    select 1 from subscriptions s
    where s.id = subscription_slots.subscription_id
      and auth.uid() = (select auth_uid from users where users.id = s.user_id)
  ));
create policy "subscription_slots admin all" on subscription_slots for all using (is_admin()) with check (is_admin());

create policy "subscription_slot_dishes select own" on subscription_slot_dishes for select
  using (exists (
    select 1 from subscription_slots sl join subscriptions s on s.id = sl.subscription_id
    where sl.id = subscription_slot_dishes.subscription_slot_id
      and auth.uid() = (select auth_uid from users where users.id = s.user_id)
  ));
create policy "subscription_slot_dishes admin all" on subscription_slot_dishes for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- RPCs — mirroring create_order_with_reservation's transaction/idempotency/
-- lockdown pattern exactly. All server-side pricing is re-derived by the
-- caller (app/api/subscriptions/route.ts) before these run — never trust
-- client-submitted totals.
-- ============================================================================

create or replace function create_subscription_with_pending_payment(
  p_user_id uuid, p_duration_id text, p_num_weeks integer, p_lodge text, p_room text,
  p_start_date date, p_end_date date, p_slots jsonb,
  p_food_subtotal integer, p_delivery_total integer, p_total integer, p_deliveries_total integer,
  p_tx_ref text
) returns subscriptions
language plpgsql security definer set search_path = public as $$
declare
  v_subscription subscriptions;
  v_slot jsonb;
  v_slot_id uuid;
  v_dish jsonb;
begin
  insert into subscriptions (
    user_id, duration_id, num_weeks, lodge, room, start_date, end_date,
    status, food_subtotal, delivery_total, total_paid, deliveries_total, flutterwave_tx_ref, expires_at
  ) values (
    p_user_id, p_duration_id, p_num_weeks, p_lodge, p_room, p_start_date, p_end_date,
    'pending_payment', p_food_subtotal, p_delivery_total, p_total, p_deliveries_total, p_tx_ref, now() + interval '15 minutes'
  ) returning * into v_subscription;

  for v_slot in select * from jsonb_array_elements(p_slots)
  loop
    insert into subscription_slots (subscription_id, meal_time, addon_enabled, addon_label, addon_price_kobo)
    values (
      v_subscription.id, v_slot->>'meal_time',
      coalesce((v_slot->>'addon_enabled')::boolean, false),
      v_slot->>'addon_label',
      nullif(v_slot->>'addon_price_kobo', '')::integer
    )
    returning id into v_slot_id;

    for v_dish in select * from jsonb_array_elements(v_slot->'dishes')
    loop
      insert into subscription_slot_dishes (
        subscription_slot_id, dish_key, dish_name, frequency_per_week, unit_price_kobo, scheduled_weekdays
      ) values (
        v_slot_id,
        v_dish->>'dish_key',
        v_dish->>'dish_name',
        (v_dish->>'frequency_per_week')::integer,
        (v_dish->>'unit_price_kobo')::integer,
        coalesce((select array_agg(x::integer) from jsonb_array_elements_text(v_dish->'scheduled_weekdays') x), '{}')
      );
    end loop;
  end loop;

  return v_subscription;
end; $$;

create or replace function mark_subscription_paid(p_subscription_id uuid, p_tx_id text) returns subscriptions
language plpgsql security definer set search_path = public as $$
declare v_subscription subscriptions;
begin
  update subscriptions set status = 'active', paid_at = now(), flutterwave_tx_id = p_tx_id
    where id = p_subscription_id and status = 'pending_payment' returning * into v_subscription;
  if not found then
    select * into v_subscription from subscriptions where id = p_subscription_id; -- idempotent replay
  end if;
  return v_subscription;
end; $$;

create or replace function expire_pending_subscription(p_subscription_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update subscriptions set status = 'cancelled', cancelled_at = now()
    where id = p_subscription_id and status = 'pending_payment';
end; $$;

-- Fulfillment: called once per (subscription, scheduled dish, day) by the daily
-- cron. Already prepaid, so the resulting order is inserted straight into
-- payment_status='paid' — no Flutterwave round-trip per delivery. Plan dishes
-- are kitchen-capacity items, not unit-tracked inventory (unlike a la carte
-- menu_items), so there's no stock guard here — a future capacity-planning
-- feature would live in the kitchen/ops tooling, not this RPC.
create or replace function create_subscription_delivery_order(
  p_subscription_id uuid, p_dish_key text, p_dish_name text, p_unit_price integer,
  p_addon_label text, p_addon_price integer
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_subscription subscriptions;
  v_items jsonb;
  v_subtotal integer;
  v_order orders;
begin
  select * into v_subscription from subscriptions where id = p_subscription_id;

  v_subtotal := p_unit_price + coalesce(p_addon_price, 0);
  v_items := jsonb_build_array(jsonb_build_object(
    'menu_item_id', p_dish_key, 'name', p_dish_name, 'qty', 1, 'unit_price', p_unit_price,
    'addons', case when p_addon_label is not null then jsonb_build_array(p_addon_label) else '[]'::jsonb end
  ));

  insert into orders (
    user_id, items, subtotal, delivery_fee, total, lodge, room,
    payment_status, order_status, channel, subscription_id, paid_at
  ) values (
    v_subscription.user_id, v_items, v_subtotal, 0, v_subtotal, v_subscription.lodge, v_subscription.room,
    'paid', 'paid', 'web', p_subscription_id, now()
  ) returning * into v_order;

  update subscriptions set deliveries_used = deliveries_used + 1 where id = p_subscription_id;

  return v_order;
end; $$;

revoke all on function create_subscription_with_pending_payment from public, anon, authenticated;
revoke all on function mark_subscription_paid from public, anon, authenticated;
revoke all on function expire_pending_subscription from public, anon, authenticated;
revoke all on function create_subscription_delivery_order from public, anon, authenticated;
grant execute on function create_subscription_with_pending_payment to service_role;
grant execute on function mark_subscription_paid to service_role;
grant execute on function expire_pending_subscription to service_role;
grant execute on function create_subscription_delivery_order to service_role;

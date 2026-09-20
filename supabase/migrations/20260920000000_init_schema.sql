-- 29Foods v1 schema
-- Identity model: a `users` row may originate from Google OAuth (web, auth_uid) and/or
-- Telegram (bot, telegram_id) independently. Phone is optional, added later, and used only
-- as rider-contact info plus an explicit, user-initiated merge key across surfaces
-- (see packages/core/src/identity.ts: linkPhoneToUser).

create extension if not exists pgcrypto;

-- ========== ADMIN AUTH (Supabase Auth, separate from customer identity) ==========
create table admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin')),
  name text,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_profiles where id = auth.uid());
$$;

-- ========== QR / LODGES ==========
create table qr_codes (
  qr_code text primary key,
  lodge_name text not null,
  zone text,
  lat numeric,
  lng numeric,
  stickers_placed int not null default 1,
  date_placed date not null default current_date,
  created_at timestamptz not null default now()
);

-- ========== USERS (Google auth_uid and/or Telegram telegram_id; phone optional) ==========
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid unique references auth.users(id),      -- set on Google sign-in (web)
  telegram_id bigint unique,                             -- set on first bot contact
  phone text unique check (phone is null or phone ~ '^\+?[0-9]{10,14}$'),
  email text,
  name text,
  avatar_url text,
  lodge text,
  room text,
  acquired_via_qr text references qr_codes(qr_code),
  favourites jsonb not null default '[]',
  loyalty_points int not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  constraint users_has_identity check (auth_uid is not null or telegram_id is not null)
);
create index users_telegram_id_idx on users(telegram_id) where telegram_id is not null;
create index users_phone_idx on users(phone) where phone is not null;

-- ========== MENU / INVENTORY ==========
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('rice','protein','drink','snack')),
  price integer not null check (price >= 0),    -- kobo, avoids float rounding
  is_available boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_category_idx on menu_items(category);

create table inventory (
  menu_item_id uuid primary key references menu_items(id) on delete cascade,
  stock_count integer not null default 0 check (stock_count >= 0),
  low_stock_threshold integer not null default 5,
  updated_at timestamptz not null default now()
);

-- ========== RIDERS ==========
create table riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  telegram_id bigint unique,
  phone text unique,
  cycle_status text not null default 'offline'
    check (cycle_status in ('at_base','heading_back','out_delivering','offline')),
  assigned_bike text,
  last_location jsonb,        -- v2: {lat,lng,updated_at}
  created_at timestamptz not null default now()
);
create index riders_cycle_status_idx on riders(cycle_status);

-- ========== ORDERS ==========
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  items jsonb not null,        -- [{menu_item_id,name,qty,unit_price,addons}]
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  lodge text not null,
  room text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  order_status text not null default 'placed'
    check (order_status in ('placed','paid','preparing','ready','out_for_delivery','delivered','cancelled')),
  assigned_rider_id uuid references riders(id),
  source_qr text references qr_codes(qr_code),
  channel text not null check (channel in ('web','telegram')),
  flutterwave_tx_ref text unique,
  flutterwave_tx_id text,
  expires_at timestamptz,      -- pending-order sweep deadline
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz
);
create index orders_user_id_idx on orders(user_id);
create index orders_status_idx on orders(order_status);
create index orders_rider_idx on orders(assigned_rider_id);
create index orders_pending_expiry_idx on orders(expires_at) where payment_status = 'pending';
create index orders_created_at_idx on orders(created_at desc);

-- ========== OFFLINE-SYNC OUTBOX (rider bot resilience) ==========
create table order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  actor_type text not null check (actor_type in ('rider','admin','system','customer')),
  actor_id uuid,
  from_status text,
  to_status text not null,
  client_op_id text,           -- idempotency key generated client-side at tap time
  applied boolean not null default false,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
create unique index order_status_events_dedupe
  on order_status_events(order_id, client_op_id) where client_op_id is not null;
create index order_status_events_unapplied_idx on order_status_events(applied) where applied = false;

-- ========== FEEDBACK ==========
create table feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  user_id uuid not null references users(id),
  reaction text not null check (reaction in ('fire','neutral','down')),
  comment text,
  created_at timestamptz not null default now()
);
create index feedback_order_idx on feedback(order_id);

-- ========== BROADCASTS ==========
create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  target text not null check (target in ('all','lodge','zone','inactive_users')),
  target_value text,
  sent_at timestamptz,
  sent_count int not null default 0,
  created_by uuid references admin_profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- Menu/inventory/QR data is public-read. Everything else defaults to deny for
-- anon/authenticated; trusted writes happen via SECURITY DEFINER functions or
-- server-side code running with the service_role key (which bypasses RLS).
-- ============================================================================

alter table users enable row level security;
alter table menu_items enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table riders enable row level security;
alter table feedback enable row level security;
alter table broadcasts enable row level security;
alter table qr_codes enable row level security;
alter table order_status_events enable row level security;
alter table admin_profiles enable row level security;

create policy "menu_items public read" on menu_items for select using (true);
create policy "menu_items admin write" on menu_items for all using (is_admin()) with check (is_admin());

create policy "inventory public read" on inventory for select using (true);
create policy "inventory admin write" on inventory for update using (is_admin()) with check (is_admin());

create policy "qr_codes public read" on qr_codes for select using (true);
create policy "qr_codes admin write" on qr_codes for all using (is_admin()) with check (is_admin());

-- users: read-your-own-row only (via Google-authenticated auth_uid); no direct client writes at all —
-- profile edits (name/lodge/room) and the phone-link merge go through server-side code using
-- packages/core/identity.ts, which whitelists editable fields and never trusts client-supplied
-- loyalty_points/telegram_id/auth_uid.
create policy "users select own" on users for select using (auth.uid() = auth_uid);
create policy "users admin read" on users for select using (is_admin());

create policy "orders select own" on orders for select
  using (auth.uid() = (select auth_uid from users where users.id = orders.user_id));
create policy "orders admin all" on orders for all using (is_admin()) with check (is_admin());

create policy "feedback insert own" on feedback for insert
  with check (
    auth.uid() = (select auth_uid from users where users.id = feedback.user_id)
    and exists (select 1 from orders o where o.id = order_id and o.user_id = feedback.user_id and o.order_status = 'delivered')
  );
create policy "feedback select own" on feedback for select
  using (auth.uid() = (select auth_uid from users where users.id = feedback.user_id) or is_admin());

create policy "riders admin all" on riders for all using (is_admin()) with check (is_admin());
create policy "broadcasts admin all" on broadcasts for all using (is_admin()) with check (is_admin());
create policy "admin_profiles self read" on admin_profiles for select using (auth.uid() = id or is_admin());
-- order_status_events: no anon/authenticated policy at all -> default-deny; only service_role (bots) and is_admin() dashboards touch it
create policy "order_status_events admin read" on order_status_events for select using (is_admin());

-- ============================================================================
-- Atomic inventory reservation + order lifecycle functions
-- Reservation happens at ORDER CREATION (not payment confirmation) via a guarded,
-- atomic decrement (`where stock_count >= qty`) — this is what prevents overselling
-- under concurrent orders; there is no read-then-write race.
-- ============================================================================

create or replace function create_order_with_reservation(
  p_user_id uuid, p_items jsonb, p_lodge text, p_room text,
  p_delivery_fee integer, p_channel text, p_source_qr text, p_tx_ref text
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb; v_subtotal integer := 0; v_order orders; v_updated integer;
begin
  for v_item in select * from jsonb_array_elements(p_items) order by (value->>'menu_item_id')
  loop
    update inventory
      set stock_count = stock_count - (v_item->>'qty')::int, updated_at = now()
      where menu_item_id = (v_item->>'menu_item_id')::uuid
        and stock_count >= (v_item->>'qty')::int;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'OUT_OF_STOCK: %', v_item->>'menu_item_id' using errcode = 'P0001';
    end if;
    v_subtotal := v_subtotal + ((v_item->>'unit_price')::int * (v_item->>'qty')::int);
  end loop;

  insert into orders (user_id, items, subtotal, delivery_fee, total, lodge, room,
    payment_status, order_status, source_qr, channel, flutterwave_tx_ref, expires_at)
  values (p_user_id, p_items, v_subtotal, p_delivery_fee, v_subtotal + p_delivery_fee, p_lodge, p_room,
    'pending', 'placed', p_source_qr, p_channel, p_tx_ref, now() + interval '15 minutes')
  returning * into v_order;
  return v_order;   -- any exception above rolls back this function's decrements too
end; $$;

create or replace function release_order_stock(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_item jsonb; v_order orders;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.payment_status = 'paid' or v_order.order_status = 'cancelled' then return; end if;
  for v_item in select * from jsonb_array_elements(v_order.items) loop
    update inventory set stock_count = stock_count + (v_item->>'qty')::int, updated_at = now()
      where menu_item_id = (v_item->>'menu_item_id')::uuid;
  end loop;
  update orders set payment_status = 'failed', order_status = 'cancelled' where id = p_order_id;
end; $$;

create or replace function mark_order_paid(p_order_id uuid, p_tx_id text) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  update orders set payment_status = 'paid', order_status = 'paid', paid_at = now(), flutterwave_tx_id = p_tx_id
    where id = p_order_id and payment_status = 'pending' returning * into v_order;
  if not found then
    select * into v_order from orders where id = p_order_id;   -- idempotent replay of the same webhook
    return v_order;
  end if;
  update users set last_order_at = now(), loyalty_points = loyalty_points + 10 where id = v_order.user_id;
  return v_order;
end; $$;

-- ========== Phone-link merge (see packages/core/src/identity.ts:linkPhoneToUser) ==========
-- Older row (by created_at) is canonical: identifiers the newer row has that the older lacks
-- are copied over, orders/feedback are reassigned, and the newer row is deleted.
create or replace function link_phone_merge(p_current_user_id uuid, p_phone text) returns users
language plpgsql security definer set search_path = public as $$
declare
  v_existing users;
  v_current users;
  v_canonical users;
  v_duplicate users;
begin
  select * into v_existing from users where phone = p_phone and id != p_current_user_id;
  select * into v_current from users where id = p_current_user_id;

  if v_existing.id is null then
    update users set phone = p_phone where id = p_current_user_id returning * into v_current;
    return v_current;
  end if;

  if v_existing.created_at <= v_current.created_at then
    v_canonical := v_existing; v_duplicate := v_current;
  else
    v_canonical := v_current; v_duplicate := v_existing;
  end if;

  update users set
    phone = p_phone,
    telegram_id = coalesce(v_canonical.telegram_id, v_duplicate.telegram_id),
    auth_uid = coalesce(v_canonical.auth_uid, v_duplicate.auth_uid),
    email = coalesce(v_canonical.email, v_duplicate.email),
    name = coalesce(v_canonical.name, v_duplicate.name),
    avatar_url = coalesce(v_canonical.avatar_url, v_duplicate.avatar_url),
    lodge = coalesce(v_canonical.lodge, v_duplicate.lodge),
    room = coalesce(v_canonical.room, v_duplicate.room)
  where id = v_canonical.id
  returning * into v_canonical;

  update orders set user_id = v_canonical.id where user_id = v_duplicate.id;
  update feedback set user_id = v_canonical.id where user_id = v_duplicate.id;
  delete from users where id = v_duplicate.id;

  return v_canonical;
end; $$;

-- lock down: only service_role may call these (never exposed to anon/authenticated via PostgREST RPC)
revoke all on function create_order_with_reservation from public, anon, authenticated;
revoke all on function release_order_stock from public, anon, authenticated;
revoke all on function mark_order_paid from public, anon, authenticated;
revoke all on function link_phone_merge from public, anon, authenticated;
grant execute on function create_order_with_reservation to service_role;
grant execute on function release_order_stock to service_role;
grant execute on function mark_order_paid to service_role;
grant execute on function link_phone_merge to service_role;

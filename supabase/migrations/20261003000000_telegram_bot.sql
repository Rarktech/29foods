-- Telegram customer bot: hero menu items, wallet, per-order spin, order discounts/notes,
-- persistent bot sessions, and the personalization flags the conversational flow needs.
-- Every money movement (wallet debit/credit/refund) goes through the SECURITY DEFINER
-- functions below, never direct table writes — same rule as orders/inventory.

-- ========== Menu ==========
alter table menu_items add column is_hero boolean not null default false;
update menu_items set is_hero = true where name in ('Party Jollof', 'Grilled Chicken');

-- ========== Users ==========
alter table users add column wallet_balance integer not null default 0 check (wallet_balance >= 0);
alter table users add column broadcast_opt_out boolean not null default false;
alter table users add column dietary_note text;
alter table users add column open_reminder_requested boolean not null default false;

-- ========== Orders ==========
alter table orders add column discount integer not null default 0 check (discount >= 0);
alter table orders add column wallet_paid integer not null default 0 check (wallet_paid >= 0);
alter table orders add column note text;

-- ========== Spin: one spin per paid order ==========
alter table spin_wins add column order_id uuid unique references orders(id);
alter table orders add column spin_win_id uuid references spin_wins(id);

-- ========== Wallet ledger ==========
create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount integer not null,                       -- kobo; positive = credit, negative = debit
  kind text not null check (kind in ('topup', 'order_payment', 'refund')),
  order_id uuid references orders(id),
  flutterwave_tx_ref text unique,
  flutterwave_tx_id text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index wallet_transactions_user_id_idx on wallet_transactions(user_id, created_at desc);
alter table wallet_transactions enable row level security;
create policy "wallet_transactions select own" on wallet_transactions for select
  using (auth.uid() = (select auth_uid from users where users.id = wallet_transactions.user_id) or is_admin());
-- writes: service role / SECURITY DEFINER functions only.

-- ========== Bot sessions (grammY storage adapter) ==========
create table bot_sessions (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table bot_sessions enable row level security;
-- no policies: service role only.

-- ========== Order creation, now with discount / wallet hold / spin win / note ==========
-- Dropped and recreated (not just replaced) because adding parameters to a function
-- creates a new overload in Postgres, which would make the old 8-arg call ambiguous.
drop function create_order_with_reservation(uuid, jsonb, text, text, integer, text, text, text);

create or replace function create_order_with_reservation(
  p_user_id uuid, p_items jsonb, p_lodge text, p_room text,
  p_delivery_fee integer, p_channel text, p_source_qr text, p_tx_ref text,
  p_discount integer default 0, p_wallet_amount integer default 0,
  p_spin_win_id uuid default null, p_note text default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb; v_subtotal integer := 0; v_order orders; v_updated integer; v_total integer; v_balance integer;
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

  v_total := greatest(0, v_subtotal + p_delivery_fee - coalesce(p_discount, 0));
  if coalesce(p_wallet_amount, 0) < 0 or coalesce(p_wallet_amount, 0) > v_total then
    raise exception 'INVALID_WALLET_AMOUNT' using errcode = 'P0001';
  end if;

  insert into orders (user_id, items, subtotal, delivery_fee, discount, total, wallet_paid, lodge, room,
    payment_status, order_status, source_qr, channel, flutterwave_tx_ref, expires_at, spin_win_id, note)
  values (p_user_id, p_items, v_subtotal, p_delivery_fee, coalesce(p_discount, 0), v_total, coalesce(p_wallet_amount, 0),
    p_lodge, p_room, 'pending', 'placed', p_source_qr, p_channel, p_tx_ref, now() + interval '15 minutes',
    p_spin_win_id, p_note)
  returning * into v_order;

  -- Wallet hold: debited now, refunded by release_order_stock if the order never completes.
  if coalesce(p_wallet_amount, 0) > 0 then
    select wallet_balance into v_balance from users where id = p_user_id for update;
    if v_balance < p_wallet_amount then
      raise exception 'INSUFFICIENT_WALLET' using errcode = 'P0001';
    end if;
    update users set wallet_balance = wallet_balance - p_wallet_amount where id = p_user_id;
    insert into wallet_transactions (user_id, amount, kind, order_id, status, completed_at)
      values (p_user_id, -p_wallet_amount, 'order_payment', v_order.id, 'completed', now());
  end if;

  return v_order;   -- any exception above rolls back this function's decrements too
end; $$;

-- ========== Release: also refunds any wallet hold ==========
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
  if v_order.wallet_paid > 0 then
    update users set wallet_balance = wallet_balance + v_order.wallet_paid where id = v_order.user_id;
    insert into wallet_transactions (user_id, amount, kind, order_id, status, completed_at)
      values (v_order.user_id, v_order.wallet_paid, 'refund', v_order.id, 'completed', now());
  end if;
  update orders set payment_status = 'failed', order_status = 'cancelled' where id = p_order_id;
end; $$;

-- ========== Paid: also redeems the applied spin win ==========
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
  if v_order.spin_win_id is not null then
    update spin_wins set redeemed = true, redeemed_at = now(), redeemed_order_id = v_order.id
      where id = v_order.spin_win_id and redeemed = false;
  end if;
  return v_order;
end; $$;

-- Orders whose whole total was held from the wallet need no Flutterwave round-trip.
create or replace function pay_order_fully_from_wallet(p_order_id uuid) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.wallet_paid <> v_order.total then
    raise exception 'WALLET_DOES_NOT_COVER_ORDER' using errcode = 'P0001';
  end if;
  return mark_order_paid(p_order_id, 'wallet');
end; $$;

-- ========== Wallet top-ups ==========
create or replace function create_wallet_topup(p_user_id uuid, p_amount integer, p_tx_ref text)
returns wallet_transactions
language plpgsql security definer set search_path = public as $$
declare v_tx wallet_transactions;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT' using errcode = 'P0001'; end if;
  insert into wallet_transactions (user_id, amount, kind, flutterwave_tx_ref, status)
    values (p_user_id, p_amount, 'topup', p_tx_ref, 'pending')
    returning * into v_tx;
  return v_tx;
end; $$;

-- Idempotent — a replayed webhook finds the row already completed and changes nothing.
create or replace function complete_wallet_topup(p_tx_ref text, p_tx_id text)
returns wallet_transactions
language plpgsql security definer set search_path = public as $$
declare v_tx wallet_transactions;
begin
  update wallet_transactions set status = 'completed', completed_at = now(), flutterwave_tx_id = p_tx_id
    where flutterwave_tx_ref = p_tx_ref and status = 'pending'
    returning * into v_tx;
  if not found then
    select * into v_tx from wallet_transactions where flutterwave_tx_ref = p_tx_ref;
    return v_tx;
  end if;
  update users set wallet_balance = wallet_balance + v_tx.amount where id = v_tx.user_id;
  return v_tx;
end; $$;

-- The bot listens for completed top-ups via Realtime.
alter publication supabase_realtime add table wallet_transactions;

-- Realtime UPDATE payloads only carry the primary key in `old` unless the table has
-- REPLICA IDENTITY FULL — the bots diff old vs new status to send each status ping
-- exactly once, so they need the full previous row.
alter table orders replica identity full;
alter table wallet_transactions replica identity full;

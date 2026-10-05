-- "Ask someone to pay": a student builds a meal plan and shares a link; a loved one
-- (no 29Foods account needed) opens it and pays by card/transfer/USSD via Flutterwave.
-- The plan activates the moment the payment is confirmed. This is the one place the
-- website takes a direct card payment — the payer isn't a user, so has no wallet.

create table plan_pay_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                              -- the short code in /pay/<code>
  subscription_id uuid not null unique references subscriptions(id) on delete cascade,
  requester_user_id uuid not null references users(id) on delete cascade,
  amount integer not null check (amount > 0),             -- kobo; always the plan's total_paid
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  opened_at timestamptz,                                  -- first time someone other than the requester opened it
  payer_name text,
  payer_email text,
  payer_message text check (payer_message is null or char_length(payer_message) <= 200),
  flutterwave_tx_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index plan_pay_requests_requester_idx on plan_pay_requests(requester_user_id, created_at desc);

alter table plan_pay_requests enable row level security;
create policy "plan_pay_requests select own" on plan_pay_requests for select
  using (auth.uid() = (select auth_uid from users where users.id = plan_pay_requests.requester_user_id) or is_admin());
-- The public /pay page and all writes go through server routes (service role).

-- New in-app notification kind for "your link was opened" / "Mum paid for your plan".
alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'order_delivered', 'deal', 'menu_drop', 'loyalty', 'cart_reminder',
  'plan_renew', 'plan_expired', 'referral', 'winback', 'plan_payment'
));

-- Called by the Flutterwave webhook once a payer's payment is verified. Activates the plan
-- with its dates starting from the day it's actually paid (a link may sit for a day or two),
-- and records the request as paid. Idempotent: a replayed webhook changes nothing. If the
-- request had already expired or been cancelled when the money arrived, the plan is still
-- activated — the payer has paid, so the student gets their food.
create or replace function mark_plan_pay_request_paid(p_code text, p_tx_id text) returns plan_pay_requests
language plpgsql security definer set search_path = public as $$
declare v_request plan_pay_requests; v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  select * into v_request from plan_pay_requests where code = p_code for update;
  if not found then
    raise exception 'PAY_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_request.status = 'paid' then
    return v_request;
  end if;

  update subscriptions
    set status = 'active', paid_at = now(), flutterwave_tx_id = p_tx_id, cancelled_at = null,
        start_date = v_today, end_date = v_today + (num_weeks * 7 - 1)
    where id = v_request.subscription_id and status in ('pending_payment', 'cancelled');

  update plan_pay_requests set status = 'paid', paid_at = now(), flutterwave_tx_id = p_tx_id
    where id = v_request.id
    returning * into v_request;
  return v_request;
end; $$;

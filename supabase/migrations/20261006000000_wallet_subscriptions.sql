-- The website is wallet-only: meal plans (subscriptions) are paid from the wallet too,
-- with Flutterwave used only to fund the wallet. This adds the ledger link and the
-- atomic "pay this pending plan from the wallet" function.

alter table wallet_transactions add column subscription_id uuid references subscriptions(id);

alter table wallet_transactions drop constraint wallet_transactions_kind_check;
alter table wallet_transactions add constraint wallet_transactions_kind_check
  check (kind in ('topup', 'order_payment', 'subscription_payment', 'refund'));

-- Debits the plan's total from the user's wallet and activates it, in one transaction.
-- Idempotent: a plan that's no longer pending_payment is returned unchanged, never
-- charged twice. Raises INSUFFICIENT_WALLET (and changes nothing) if the balance is short.
create or replace function pay_subscription_from_wallet(p_subscription_id uuid) returns subscriptions
language plpgsql security definer set search_path = public as $$
declare v_subscription subscriptions; v_balance integer;
begin
  select * into v_subscription from subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_subscription.status <> 'pending_payment' then
    return v_subscription;
  end if;

  select wallet_balance into v_balance from users where id = v_subscription.user_id for update;
  if v_balance < v_subscription.total_paid then
    raise exception 'INSUFFICIENT_WALLET' using errcode = 'P0001';
  end if;

  update users set wallet_balance = wallet_balance - v_subscription.total_paid where id = v_subscription.user_id;
  insert into wallet_transactions (user_id, amount, kind, subscription_id, status, completed_at)
    values (v_subscription.user_id, -v_subscription.total_paid, 'subscription_payment', v_subscription.id, 'completed', now());

  return mark_subscription_paid(p_subscription_id, 'wallet');
end; $$;

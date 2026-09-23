-- DEMO-ONLY SCAFFOLDING — auto-advances web-channel orders through their lifecycle
-- (paid -> ready -> out_for_delivery -> delivered) so a fresh order can be placed and
-- watched tracking live, for testing and investor demos, without a real rider/admin
-- ever touching it. This is explicitly temporary: once the real rider/admin-triggered
-- flow is ready, turn this off with:
--
--   select cron.unschedule('simulate-order-progress');
--
-- and optionally `drop function simulate_advance_orders();` afterwards. It never
-- touches Telegram-channel orders (channel = 'telegram'), which already have a real
-- flow via bot-admin/bot-rider.

create extension if not exists pg_cron;

create or replace function simulate_advance_orders() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  next_status text;
  demo_rider_id uuid;
begin
  select id into demo_rider_id from riders order by created_at asc limit 1;

  for r in
    select o.id, o.order_status,
           coalesce(
             (select max(e.applied_at) from order_status_events e where e.order_id = o.id and e.applied = true),
             o.paid_at, o.created_at
           ) as stage_entered_at
    from orders o
    where o.channel = 'web'
      and o.order_status in ('paid', 'preparing', 'ready', 'out_for_delivery')
  loop
    if r.stage_entered_at is null or now() - r.stage_entered_at < interval '30 seconds' then
      continue;
    end if;

    next_status := case r.order_status
      when 'paid' then 'ready'
      when 'preparing' then 'ready'
      when 'ready' then 'out_for_delivery'
      when 'out_for_delivery' then 'delivered'
    end;

    insert into order_status_events (order_id, actor_type, actor_id, to_status, client_op_id, applied, applied_at)
    values (r.id, 'system', null, next_status, gen_random_uuid()::text, true, now());

    if next_status = 'ready' then
      update orders set order_status = next_status, assigned_rider_id = coalesce(assigned_rider_id, demo_rider_id) where id = r.id;
    elsif next_status = 'delivered' then
      update orders set order_status = next_status, delivered_at = now() where id = r.id;
    else
      update orders set order_status = next_status where id = r.id;
    end if;
  end loop;
end;
$$;

select cron.schedule('simulate-order-progress', '* * * * *', 'select simulate_advance_orders();');

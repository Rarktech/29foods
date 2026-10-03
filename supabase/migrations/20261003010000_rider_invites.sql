-- Rider onboarding from the admin bot: the admin creates a rider and gets a one-time
-- invite link to the rider bot; tapping it links the rider's Telegram account, so nobody
-- has to look up a numeric Telegram id. Riders are deactivated, never deleted, because
-- past orders reference them.

alter table riders add column invite_code text unique;
alter table riders add column invite_expires_at timestamptz;
alter table riders add column is_active boolean not null default true;

-- Claims an invite atomically: a code works once, only before it expires, and only if
-- this Telegram account isn't already linked to a different rider.
create or replace function claim_rider_invite(p_code text, p_telegram_id bigint) returns riders
language plpgsql security definer set search_path = public as $$
declare v_rider riders;
begin
  if exists (select 1 from riders where telegram_id = p_telegram_id and invite_code is distinct from p_code) then
    raise exception 'TELEGRAM_ALREADY_LINKED' using errcode = 'P0001';
  end if;
  update riders
    set telegram_id = p_telegram_id, invite_code = null, invite_expires_at = null, is_active = true
    where invite_code = p_code and invite_expires_at > now()
    returning * into v_rider;
  if not found then
    raise exception 'INVITE_INVALID' using errcode = 'P0001';
  end if;
  return v_rider;
end; $$;

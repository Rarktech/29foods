-- Spin & Win: one free spin per calendar day (WAT), winnable prizes redeemable for 6
-- hours before they expire. "Try again" results don't consume the day's free spin —
-- eligibility is keyed off the most recent non-try-again win, not "any row today".

create table spin_wins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  prize_key text not null,
  prize_label text not null,
  is_try_again boolean not null default false,
  won_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed boolean not null default false,
  redeemed_at timestamptz,
  redeemed_order_id uuid references orders(id),
  created_at timestamptz not null default now()
);
create index spin_wins_user_id_won_at_idx on spin_wins(user_id, won_at desc);

alter table spin_wins enable row level security;

create policy "spin_wins select own" on spin_wins for select
  using (auth.uid() = (select auth_uid from users where users.id = spin_wins.user_id));
-- writes go through the server-side /api/spin route (service role) only — no client write policy.

-- Saved delivery locations (Home/Work/Friend/Other), so returning customers pick
-- from a short list instead of retyping lodge/room every time. Unlike `users`,
-- this is safe for direct client writes (no pricing/security-sensitive logic),
-- so RLS grants full CRUD on the caller's own rows.

create table saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null default 'home' check (label in ('home', 'work', 'friend', 'other')),
  lodge text not null,
  room text,
  note text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index saved_locations_user_id_idx on saved_locations(user_id);

alter table saved_locations enable row level security;

create policy "saved_locations select own" on saved_locations for select
  using (auth.uid() = (select auth_uid from users where users.id = saved_locations.user_id));

create policy "saved_locations insert own" on saved_locations for insert
  with check (auth.uid() = (select auth_uid from users where users.id = saved_locations.user_id));

create policy "saved_locations update own" on saved_locations for update
  using (auth.uid() = (select auth_uid from users where users.id = saved_locations.user_id))
  with check (auth.uid() = (select auth_uid from users where users.id = saved_locations.user_id));

create policy "saved_locations delete own" on saved_locations for delete
  using (auth.uid() = (select auth_uid from users where users.id = saved_locations.user_id));

create policy "saved_locations admin read" on saved_locations for select using (is_admin());

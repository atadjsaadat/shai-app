-- Push subscriptions: one row per device per user
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;
create policy "Users manage own subscriptions"
  on push_subscriptions for all using ((select auth.uid()) = user_id);

-- Feed alarms: one active alarm per child (upserted when reminder is set)
create table if not exists feed_alarms (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  due_at timestamptz not null,
  interval_mins integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id)
);

alter table feed_alarms enable row level security;
create policy "Users manage own feed alarms"
  on feed_alarms for all using ((select auth.uid()) = user_id);

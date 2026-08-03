create table if not exists child_invites (
  id                   uuid primary key default gen_random_uuid(),
  child_id             uuid not null references children(id) on delete cascade,
  invited_by_user_id   uuid not null references auth.users(id) on delete cascade,
  token                text not null unique default replace(gen_random_uuid()::text, '-', ''),
  accepted_by_user_id  uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null default (now() + interval '7 days')
);

alter table child_invites enable row level security;

create policy "Owner manages invites"
  on child_invites for all
  using (invited_by_user_id = auth.uid())
  with check (invited_by_user_id = auth.uid());

grant all on public.child_invites to service_role;
grant all on public.child_invites to authenticated;

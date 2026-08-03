create table if not exists vaccinations (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references children(id) on delete cascade,
  logged_by_user_id   uuid not null references auth.users(id) on delete cascade,
  vaccine_key         text not null,
  given_date          date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (child_id, vaccine_key)
);

alter table vaccinations enable row level security;

create policy "Users can manage own child vaccinations"
  on vaccinations for all
  using (child_id in (select id from children where user_id = auth.uid()))
  with check (child_id in (select id from children where user_id = auth.uid()));

grant all on public.vaccinations to service_role;
grant all on public.vaccinations to authenticated;
grant select on public.vaccinations to anon;

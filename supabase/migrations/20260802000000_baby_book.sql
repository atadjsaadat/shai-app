-- Baby book — structured milestone entries (text only, no photos)

create table if not exists baby_book (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references children(id) on delete cascade,
  logged_by_user_id   uuid not null references auth.users(id) on delete cascade,
  milestone_date      date not null,
  milestone_type      text not null,
  title               text not null,
  note                text,
  child_age_days      int,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table baby_book enable row level security;

create policy "Users can manage own baby book entries"
  on baby_book for all
  using (
    child_id in (
      select id from children where user_id = auth.uid()
    )
  )
  with check (
    child_id in (
      select id from children where user_id = auth.uid()
    )
  );

grant all on public.baby_book to service_role;
grant all on public.baby_book to authenticated;
grant select on public.baby_book to anon;

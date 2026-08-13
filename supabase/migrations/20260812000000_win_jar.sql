create table if not exists win_jar (
  win_id            uuid primary key default gen_random_uuid(),
  child_id          uuid not null references children(id) on delete cascade,
  logged_by_user_id uuid not null references auth.users(id) on delete cascade,
  logged_at         timestamptz not null default now(),
  win_type          text,
  food_involved     text,
  parent_note       text,
  shared            boolean not null default false,
  season            text,
  child_age_days    integer,
  updated_at        timestamptz not null default now()
);

create index if not exists win_jar_child_id_idx on win_jar(child_id);

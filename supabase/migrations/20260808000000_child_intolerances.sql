alter table children
  add column if not exists intolerances text[] not null default '{}';

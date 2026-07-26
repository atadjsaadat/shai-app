create table if not exists public.journal_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  child_id             uuid references public.children(id) on delete set null,
  content              text not null,
  dictated             boolean not null default false,
  include_in_ai_context boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create policy "Users manage own journal entries"
  on public.journal_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index journal_entries_user_id_idx on public.journal_entries (user_id, created_at desc);

grant select, insert, update, delete on public.journal_entries to anon, authenticated;

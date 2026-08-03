create table if not exists distress_flags (
  flag_id                              uuid primary key default gen_random_uuid(),
  user_id                              uuid not null references auth.users(id) on delete cascade,
  flagged_at                           timestamptz not null default now(),
  level                                smallint not null check (level between 1 and 3),
  language_detected                    text,
  shai_response_given                  text,
  escalated                            boolean not null default false,
  escalation_type                      text,
  reviewed                             boolean not null default false,
  resource_surfaced_at                 timestamptz,
  coparent_notified_at                 timestamptz,
  coparent_responded_at                timestamptz,
  coparent_response                    text,
  coparent_initiated_consent_request   boolean not null default false,
  support_person_notified_at           timestamptz,
  support_person_responded_at          timestamptz,
  clinical_notified_at                 timestamptz,
  clinical_responded_at                timestamptz,
  in_moment_consent_clinical           boolean,
  in_moment_consent_support_person     boolean,
  checkin_notification_sent_at         timestamptz
);

alter table distress_flags enable row level security;

-- No user-facing access — service_role only (admin reviews flags)
create policy "No user access to distress flags"
  on distress_flags for all
  using (false);

grant all on public.distress_flags to service_role;

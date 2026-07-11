-- =====================================================
-- SHAi Database Schema
-- Run once in the Supabase SQL Editor (Frankfurt)
-- =====================================================

-- ─────────────────────────────────────────────────────
-- SHARED UTILITIES
-- ─────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────
-- PROFILES  (extends auth.users 1-to-1)
-- ─────────────────────────────────────────────────────

create table if not exists profiles (
  id                                    uuid primary key references auth.users(id) on delete cascade,
  tier                                  text not null default 'free',
  consent_gdpr                          boolean not null default true,
  consent_data_research                 boolean not null default false,
  consent_marketing                     boolean not null default false,
  data_retention_preference             text default '10_years',
  account_deleted_at                    timestamptz,
  country                               text,
  language                              text default 'en',
  referral_source                       text,
  referred_by                           uuid,
  referring_clinician_id                uuid,
  waitlist_joined_at                    timestamptz,
  beta_joined_at                        timestamptz,
  subscription_type                     text,
  subscription_start                    timestamptz,
  subscription_end                      timestamptz,
  gift_code_used                        text,
  consent_clinical_escalation           boolean default false,
  consent_coparent_notification         boolean default false,
  consent_support_person_notification   boolean default false,
  phone_number_encrypted                text,
  support_person_name                   text,
  support_person_contact_encrypted      text,
  support_person_relationship           text,
  coparent_notification_override_requested boolean default false,
  last_active                           timestamptz,
  created_at                            timestamptz not null default now(),
  updated_at                            timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- Auto-create profile row immediately on auth.users insert
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, tier, created_at, updated_at)
  values (new.id, 'free', now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────────────
-- CHILDREN
-- ─────────────────────────────────────────────────────

create table if not exists children (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null references auth.users(id) on delete cascade,
  linked_user_ids               uuid[] default '{}',
  name                          text not null,
  date_of_birth                 text,           -- MM/YYYY only (GDPR — no exact birth date stored)
  sex                           text check (sex in ('male', 'female', 'not_specified')),
  weight_kg                     numeric,
  height_cm                     numeric,
  birth_weight_kg               text,           -- stored as entered ("3.2 kg", "3200g", etc.)
  birth_length_cm               numeric,
  allergies                     text[] default '{}',
  dietary_restrictions          text[] default '{}',
  is_selective_eater            boolean default false,
  selective_eater_details       text,
  is_nicu_graduate              boolean default false,
  gestational_age_at_birth      integer,
  adjusted_age                  text,
  profile_photo_url             text,
  avatar_cartoon_url            text,
  sibling_group_id              uuid,
  feeding_method_birth          text,
  breastfeeding_duration_months integer,
  formula_type                  text,
  weaning_start_date            date,
  weaning_method                text,
  communication_preference      text,
  relationship_to_child         text,
  dietary_preference            text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

alter table children enable row level security;

create policy "Users can view own children"
  on children for select
  using (auth.uid() = user_id or auth.uid() = any(linked_user_ids));
create policy "Users can insert own children"
  on children for insert with check (auth.uid() = user_id);
create policy "Users can update own children"
  on children for update using (auth.uid() = user_id);

create trigger children_updated_at
  before update on children
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- FOOD LOGS
-- ─────────────────────────────────────────────────────

create table if not exists food_logs (
  id                        uuid primary key default gen_random_uuid(),
  child_id                  uuid not null references children(id) on delete cascade,
  logged_by_user_id         uuid not null references auth.users(id),
  logged_at                 timestamptz not null default now(),
  meal_type                 text,
  food_name                 text,
  brand                     text,
  manufacturer              text,
  barcode                   text,
  product_category          text,
  nova_classification       integer,
  data_source               text,             -- 'ai' | 'barcode' | 'manual'
  serving_size_description  text,
  serving_size_ml           numeric,
  serving_size_g            numeric,
  confidence_score          numeric,
  -- free tier macros
  calories_kcal             numeric,
  protein_g                 numeric,
  carbs_g                   numeric,
  fat_g                     numeric,
  fibre_g                   numeric,
  -- premium micronutrients
  calcium_mg                numeric,
  iron_mg                   numeric,
  vitamin_c_mg              numeric,
  vitamin_a_mcg             numeric,
  vitamin_d_mcg             numeric,
  zinc_mg                   numeric,
  omega3_mg                 numeric,
  -- captured, not yet surfaced in UI
  b12_mcg                   numeric,
  b6_mg                     numeric,
  folate_mcg                numeric,
  magnesium_mg              numeric,
  potassium_mg              numeric,
  sodium_mg                 numeric,
  sugar_g                   numeric,
  saturated_fat_g           numeric,
  omega6_mg                 numeric,
  iodine_mcg                numeric,
  selenium_mcg              numeric,
  phosphorus_mg             numeric,
  choline_mg                numeric,
  dha_mg                    numeric,
  vitamin_k_mcg             numeric,
  -- context
  is_carer_meal             boolean default false,
  carer_type                text,
  is_illness_day            boolean default false,
  is_hard_food_day          boolean default false,
  meal_photo_url            text,
  is_win                    boolean default false,
  win_description           text,
  texture_accepted          boolean,
  texture_notes             text,
  food_neophobia_flag       boolean default false,
  food_refused              boolean default false,
  new_food_attempt          boolean default false,
  self_fed                  boolean,
  meal_context              text,
  food_preparation_method   text,
  meal_duration_minutes     integer,
  season                    text,
  ambient_temp_c            numeric,
  weather_condition         text,
  day_of_week               text,
  child_age_days            integer,
  child_weight_at_log       numeric,
  -- offline sync
  logged_offline            boolean default false,
  offline_time_confirmed    timestamptz,
  synced_at                 timestamptz,
  -- reactions
  reaction_type             text[],
  reaction_note             text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table food_logs enable row level security;

create policy "Users can view food logs for their children"
  on food_logs for select
  using (
    auth.uid() = logged_by_user_id
    or child_id in (
      select id from children
      where user_id = auth.uid() or auth.uid() = any(linked_user_ids)
    )
  );
create policy "Users can insert food logs"
  on food_logs for insert with check (auth.uid() = logged_by_user_id);
create policy "Users can update own food logs"
  on food_logs for update using (auth.uid() = logged_by_user_id);

create trigger food_logs_updated_at
  before update on food_logs
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- BARCODE CACHE
-- ─────────────────────────────────────────────────────

create table if not exists barcode_cache (
  barcode               text primary key,
  product_name          text,
  brand                 text,
  manufacturer          text,
  product_category      text,
  nova_classification   integer,
  calories_kcal         numeric,
  protein_g             numeric,
  carbs_g               numeric,
  fat_g                 numeric,
  fibre_g               numeric,
  calcium_mg            numeric,
  iron_mg               numeric,
  vitamin_c_mg          numeric,
  vitamin_a_mcg         numeric,
  vitamin_d_mcg         numeric,
  zinc_mg               numeric,
  omega3_mg             numeric,
  b12_mcg               numeric,
  b6_mg                 numeric,
  folate_mcg            numeric,
  magnesium_mg          numeric,
  potassium_mg          numeric,
  sodium_mg             numeric,
  sugar_g               numeric,
  saturated_fat_g       numeric,
  omega6_mg             numeric,
  iodine_mcg            numeric,
  selenium_mcg          numeric,
  phosphorus_mg         numeric,
  choline_mg            numeric,
  dha_mg                numeric,
  vitamin_k_mcg         numeric,
  allergens             text[],
  serving_size_g        numeric,
  serving_size_ml       numeric,
  first_scanned_at      timestamptz not null default now(),
  last_scanned_at       timestamptz not null default now(),
  scan_count            integer not null default 1
);

alter table barcode_cache enable row level security;

-- Readable by all authenticated users; writes via admin client in API routes only
create policy "Authenticated users can read barcode cache"
  on barcode_cache for select using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────
-- NEWBORN FEED LOGS
-- ─────────────────────────────────────────────────────

create table if not exists newborn_feed_logs (
  id                      uuid primary key default gen_random_uuid(),
  child_id                uuid not null references children(id) on delete cascade,
  logged_by_user_id       uuid not null references auth.users(id),
  logged_at               timestamptz not null default now(),
  feed_type               text check (feed_type in ('breast', 'formula', 'expressed')),
  breast_side             text check (breast_side in ('left', 'right', 'both')),
  duration_minutes        integer,
  amount_ml               numeric,
  feed_alarm_set          boolean default false,
  alarm_interval_minutes  integer,
  child_age_days          integer,
  time_of_day             text,
  is_night_feed           boolean default false,
  reaction_type           text[],
  reaction_note           text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table newborn_feed_logs enable row level security;

create policy "Users can manage newborn feed logs for their children"
  on newborn_feed_logs for all
  using (
    child_id in (
      select id from children
      where user_id = auth.uid() or auth.uid() = any(linked_user_ids)
    )
  );

create trigger newborn_feed_logs_updated_at
  before update on newborn_feed_logs
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- GROWTH RECORDS
-- ─────────────────────────────────────────────────────

create table if not exists growth_records (
  id                    uuid primary key default gen_random_uuid(),
  child_id              uuid not null references children(id) on delete cascade,
  recorded_at           timestamptz not null default now(),
  weight_kg             numeric,
  height_cm             numeric,
  who_weight_percentile numeric,
  who_height_percentile numeric,
  who_bmi_percentile    numeric,
  recorded_by           uuid references auth.users(id),
  notes                 text,
  season                text,
  ambient_temp_c        numeric,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table growth_records enable row level security;

create policy "Users can manage growth records for their children"
  on growth_records for all
  using (
    child_id in (
      select id from children
      where user_id = auth.uid() or auth.uid() = any(linked_user_ids)
    )
  );

create trigger growth_records_updated_at
  before update on growth_records
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- SLEEP LOGS
-- ─────────────────────────────────────────────────────

create table if not exists sleep_logs (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references children(id) on delete cascade,
  logged_at           timestamptz not null default now(),
  sleep_quality       text,
  duration_hours      numeric,
  night_wakings       integer,
  sleep_type          text,
  child_age_days      integer,
  is_illness_day      boolean default false,
  feed_before_sleep   boolean,
  settled_easily      boolean,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table sleep_logs enable row level security;

create policy "Users can manage sleep logs for their children"
  on sleep_logs for all
  using (
    child_id in (
      select id from children
      where user_id = auth.uid() or auth.uid() = any(linked_user_ids)
    )
  );

create trigger sleep_logs_updated_at
  before update on sleep_logs
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- ILLNESS FLAGS
-- ─────────────────────────────────────────────────────

create table if not exists illness_flags (
  id                    uuid primary key default gen_random_uuid(),
  child_id              uuid not null references children(id) on delete cascade,
  start_date            date not null,
  end_date              date,
  flagged_at            timestamptz not null default now(),
  notification_sent     boolean default false,
  notification_sent_at  timestamptz,
  parent_returned_at    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table illness_flags enable row level security;

create policy "Users can manage illness flags for their children"
  on illness_flags for all
  using (child_id in (select id from children where user_id = auth.uid()));

create trigger illness_flags_updated_at
  before update on illness_flags
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────────────

create table if not exists appointments (
  id                    uuid primary key default gen_random_uuid(),
  child_id              uuid not null references children(id) on delete cascade,
  user_id               uuid not null references auth.users(id),
  appointment_type      text,
  title                 text not null,
  scheduled_at          timestamptz not null,
  location              text,
  notes                 text,
  reminder_24h_sent     boolean default false,
  reminder_1h_sent      boolean default false,
  attended              boolean,
  clinician_added       boolean default false,
  clinician_id          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table appointments enable row level security;

create policy "Users can manage own appointments"
  on appointments for all using (auth.uid() = user_id);

create trigger appointments_updated_at
  before update on appointments
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- WIN JAR
-- ─────────────────────────────────────────────────────

create table if not exists wins (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references children(id) on delete cascade,
  logged_by_user_id   uuid not null references auth.users(id),
  logged_at           timestamptz not null default now(),
  win_type            text,
  food_involved       text,
  parent_note         text,
  shared              boolean default false,
  season              text,
  child_age_days      integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table wins enable row level security;

create policy "Users can manage wins for their children"
  on wins for all
  using (
    child_id in (
      select id from children
      where user_id = auth.uid() or auth.uid() = any(linked_user_ids)
    )
  );

create trigger wins_updated_at
  before update on wins
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- HYDRATION LOGS
-- ─────────────────────────────────────────────────────

create table if not exists hydration_logs (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references children(id) on delete cascade,
  logged_at           timestamptz not null default now(),
  drink_type          text,
  amount_ml           numeric,
  confidence_score    numeric,
  is_illness_day      boolean default false,
  season              text,
  ambient_temp_c      numeric,
  child_age_days      integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table hydration_logs enable row level security;

create policy "Users can manage hydration logs for their children"
  on hydration_logs for all
  using (
    child_id in (
      select id from children
      where user_id = auth.uid() or auth.uid() = any(linked_user_ids)
    )
  );

create trigger hydration_logs_updated_at
  before update on hydration_logs
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- SUPPLEMENT LOGS
-- ─────────────────────────────────────────────────────

create table if not exists supplement_logs (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references children(id) on delete cascade,
  logged_at           timestamptz not null default now(),
  supplement_type     text,
  dose_ml_or_mg       numeric,
  brand               text,
  is_prescribed       boolean default false,
  child_age_days      integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table supplement_logs enable row level security;

create policy "Users can manage supplement logs for their children"
  on supplement_logs for all
  using (
    child_id in (
      select id from children
      where user_id = auth.uid() or auth.uid() = any(linked_user_ids)
    )
  );

create trigger supplement_logs_updated_at
  before update on supplement_logs
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- DISTRESS FLAGS
-- ─────────────────────────────────────────────────────

create table if not exists distress_flags (
  id                                    uuid primary key default gen_random_uuid(),
  user_id                               uuid not null references auth.users(id),
  flagged_at                            timestamptz not null default now(),
  language_detected                     text,
  shai_response_given                   text,
  escalated                             boolean default false,
  escalation_type                       text,
  reviewed                              boolean default false,
  coparent_notified_at                  timestamptz,
  coparent_responded_at                 timestamptz,
  coparent_response                     text,
  coparent_initiated_consent_request    boolean default false,
  support_person_notified_at            timestamptz,
  support_person_responded_at           timestamptz,
  clinical_notified_at                  timestamptz,
  clinical_responded_at                 timestamptz,
  in_moment_consent_clinical            boolean default false,
  in_moment_consent_support_person      boolean default false,
  checkin_notification_sent_at          timestamptz,
  resource_surfaced_at                  timestamptz,
  created_at                            timestamptz not null default now(),
  updated_at                            timestamptz not null default now()
);

alter table distress_flags enable row level security;

-- Users can insert their own distress flags; reads go via service role (admin review)
create policy "Users can insert own distress flags"
  on distress_flags for insert with check (auth.uid() = user_id);

create trigger distress_flags_updated_at
  before update on distress_flags
  for each row execute procedure set_updated_at();

-- ─────────────────────────────────────────────────────
-- AI OUTPUT LOGS
-- ─────────────────────────────────────────────────────

create table if not exists ai_output_logs (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid references auth.users(id),
  child_id                    uuid references children(id),
  created_at                  timestamptz not null default now(),
  model_used                  text,
  prompt_version              text,
  task_type                   text,
  input_tokens                integer,
  output_tokens               integer,
  cost_estimate               numeric,
  output_text                 text,
  parent_response             text,
  parent_accepted_suggestion  boolean
);

alter table ai_output_logs enable row level security;

create policy "Users can view own ai output logs"
  on ai_output_logs for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────
-- ADVERSE EVENTS
-- ─────────────────────────────────────────────────────

create table if not exists adverse_events (
  id                      uuid primary key default gen_random_uuid(),
  submitted_at            timestamptz not null default now(),
  submitted_by            uuid references auth.users(id),
  child_id                uuid references children(id),
  event_description       text,
  shai_output_referenced  text,
  outcome                 text,
  reviewed_at             timestamptz,
  reviewed_by             uuid,
  action_taken            text,
  reported_to_authority   boolean default false
);

alter table adverse_events enable row level security;

create policy "Users can submit adverse events"
  on adverse_events for insert with check (auth.uid() = submitted_by);

-- =====================================================
-- SHAi Cloud Supabase catch-up migration
-- Run once in the Supabase SQL Editor (Frankfurt)
-- All statements use IF NOT EXISTS — safe to re-run
-- =====================================================

-- ─────────────────────────────────────────────────────
-- food_logs — extended micronutrients + context columns
-- ─────────────────────────────────────────────────────
ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS b12_mcg          numeric,
  ADD COLUMN IF NOT EXISTS b6_mg            numeric,
  ADD COLUMN IF NOT EXISTS folate_mcg       numeric,
  ADD COLUMN IF NOT EXISTS magnesium_mg     numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg     numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg        numeric,
  ADD COLUMN IF NOT EXISTS sugar_g          numeric,
  ADD COLUMN IF NOT EXISTS saturated_fat_g  numeric,
  ADD COLUMN IF NOT EXISTS omega6_mg        numeric,
  ADD COLUMN IF NOT EXISTS iodine_mcg       numeric,
  ADD COLUMN IF NOT EXISTS selenium_mcg     numeric,
  ADD COLUMN IF NOT EXISTS phosphorus_mg    numeric,
  ADD COLUMN IF NOT EXISTS choline_mg       numeric,
  ADD COLUMN IF NOT EXISTS dha_mg           numeric,
  ADD COLUMN IF NOT EXISTS vitamin_k_mcg    numeric,
  ADD COLUMN IF NOT EXISTS is_carer_meal          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS carer_type             text,
  ADD COLUMN IF NOT EXISTS is_illness_day         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hard_food_day       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS meal_photo_url         text,
  ADD COLUMN IF NOT EXISTS is_win                 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS win_description        text,
  ADD COLUMN IF NOT EXISTS texture_accepted       boolean,
  ADD COLUMN IF NOT EXISTS texture_notes          text,
  ADD COLUMN IF NOT EXISTS food_neophobia_flag    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS food_refused           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_food_attempt       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS self_fed               boolean,
  ADD COLUMN IF NOT EXISTS meal_context           text,
  ADD COLUMN IF NOT EXISTS food_preparation_method text,
  ADD COLUMN IF NOT EXISTS meal_duration_minutes  integer,
  ADD COLUMN IF NOT EXISTS season                 text,
  ADD COLUMN IF NOT EXISTS ambient_temp_c         numeric,
  ADD COLUMN IF NOT EXISTS weather_condition      text,
  ADD COLUMN IF NOT EXISTS day_of_week            text,
  ADD COLUMN IF NOT EXISTS child_age_days         integer,
  ADD COLUMN IF NOT EXISTS child_weight_at_log    numeric,
  ADD COLUMN IF NOT EXISTS logged_offline         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS offline_time_confirmed timestamptz,
  ADD COLUMN IF NOT EXISTS synced_at              timestamptz,
  ADD COLUMN IF NOT EXISTS reaction_type          text[],
  ADD COLUMN IF NOT EXISTS reaction_note          text,
  ADD COLUMN IF NOT EXISTS brand                  text,
  ADD COLUMN IF NOT EXISTS manufacturer           text,
  ADD COLUMN IF NOT EXISTS barcode                text,
  ADD COLUMN IF NOT EXISTS product_category       text,
  ADD COLUMN IF NOT EXISTS nova_classification    integer,
  ADD COLUMN IF NOT EXISTS serving_size_ml        numeric,
  ADD COLUMN IF NOT EXISTS serving_size_g         numeric;

-- ─────────────────────────────────────────────────────
-- barcode_cache — extended micronutrients + additives_n
-- ─────────────────────────────────────────────────────
ALTER TABLE barcode_cache
  ADD COLUMN IF NOT EXISTS b12_mcg          numeric,
  ADD COLUMN IF NOT EXISTS b6_mg            numeric,
  ADD COLUMN IF NOT EXISTS folate_mcg       numeric,
  ADD COLUMN IF NOT EXISTS magnesium_mg     numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg     numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg        numeric,
  ADD COLUMN IF NOT EXISTS sugar_g          numeric,
  ADD COLUMN IF NOT EXISTS saturated_fat_g  numeric,
  ADD COLUMN IF NOT EXISTS omega6_mg        numeric,
  ADD COLUMN IF NOT EXISTS iodine_mcg       numeric,
  ADD COLUMN IF NOT EXISTS selenium_mcg     numeric,
  ADD COLUMN IF NOT EXISTS phosphorus_mg    numeric,
  ADD COLUMN IF NOT EXISTS choline_mg       numeric,
  ADD COLUMN IF NOT EXISTS dha_mg           numeric,
  ADD COLUMN IF NOT EXISTS vitamin_k_mcg    numeric,
  ADD COLUMN IF NOT EXISTS allergens        text[],
  ADD COLUMN IF NOT EXISTS serving_size_g   numeric,
  ADD COLUMN IF NOT EXISTS serving_size_ml  numeric,
  ADD COLUMN IF NOT EXISTS additives_n      integer;

-- ─────────────────────────────────────────────────────
-- children — intolerances + leaps_surfaced
-- ─────────────────────────────────────────────────────
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS intolerances     text[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS leaps_surfaced   integer[] NOT NULL DEFAULT '{}';

-- ─────────────────────────────────────────────────────
-- growth_records — head circumference
-- ─────────────────────────────────────────────────────
ALTER TABLE growth_records
  ADD COLUMN IF NOT EXISTS head_cm              numeric(5,1),
  ADD COLUMN IF NOT EXISTS who_head_percentile  numeric(5,1);

-- ─────────────────────────────────────────────────────
-- distress_flags — level + in-moment coparent consent
-- ─────────────────────────────────────────────────────
ALTER TABLE distress_flags
  ADD COLUMN IF NOT EXISTS level                      integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS in_moment_consent_coparent boolean DEFAULT false;

-- ─────────────────────────────────────────────────────
-- profiles — journal PIN
-- ─────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS journal_pin_hash       text,
  ADD COLUMN IF NOT EXISTS journal_lock_enabled   boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────
-- journal_entries table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id              uuid REFERENCES public.children(id) ON DELETE SET NULL,
  content               text NOT NULL,
  dictated              boolean NOT NULL DEFAULT false,
  include_in_ai_context boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own journal entries"
    ON public.journal_entries FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS journal_entries_user_id_idx ON public.journal_entries (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO anon, authenticated;

-- ─────────────────────────────────────────────────────
-- baby_book table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baby_book (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  logged_by_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_date      date NOT NULL,
  milestone_type      text NOT NULL,
  title               text NOT NULL,
  note                text,
  child_age_days      int,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE baby_book ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own baby book entries"
    ON baby_book FOR ALL
    USING (child_id IN (SELECT id FROM children WHERE user_id = auth.uid()))
    WITH CHECK (child_id IN (SELECT id FROM children WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON public.baby_book TO service_role;
GRANT ALL ON public.baby_book TO authenticated;
GRANT SELECT ON public.baby_book TO anon;

-- ─────────────────────────────────────────────────────
-- vaccinations table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccinations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  logged_by_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaccine_key         text NOT NULL,
  given_date          date,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, vaccine_key)
);

ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own child vaccinations"
    ON vaccinations FOR ALL
    USING (child_id IN (SELECT id FROM children WHERE user_id = auth.uid()))
    WITH CHECK (child_id IN (SELECT id FROM children WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON public.vaccinations TO service_role;
GRANT ALL ON public.vaccinations TO authenticated;
GRANT SELECT ON public.vaccinations TO anon;

-- ─────────────────────────────────────────────────────
-- child_invites table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS child_invites (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id             uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  invited_by_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token                text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  accepted_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE child_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owner manages invites"
    ON child_invites FOR ALL
    USING (invited_by_user_id = auth.uid())
    WITH CHECK (invited_by_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON public.child_invites TO service_role;
GRANT ALL ON public.child_invites TO authenticated;

-- ─────────────────────────────────────────────────────
-- win_jar table
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS win_jar (
  win_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  logged_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at         timestamptz NOT NULL DEFAULT now(),
  win_type          text,
  food_involved     text,
  parent_note       text,
  shared            boolean NOT NULL DEFAULT false,
  season            text,
  child_age_days    integer,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS win_jar_child_id_idx ON win_jar(child_id);

-- ─────────────────────────────────────────────────────
-- Performance indexes
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_children_user_id           ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_child_logged     ON food_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_newborn_feed_logs_child_logged ON newborn_feed_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_wins_child_logged          ON wins(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_records_child_recorded ON growth_records(child_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_child_logged    ON sleep_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_hydration_logs_child_logged ON hydration_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_child_logged ON supplement_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_child_scheduled ON appointments(child_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_distress_flags_user_id     ON distress_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_output_logs_user_id     ON ai_output_logs(user_id);

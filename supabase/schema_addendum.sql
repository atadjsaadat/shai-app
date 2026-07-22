-- ============================================================
-- SHAi Schema Addendum
-- Run AFTER schema.sql if it has already been applied.
-- If starting fresh, run schema.sql first, then this file.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ── updated_at trigger on barcode_cache (missing from v1) ──
ALTER TABLE public.barcode_cache
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS barcode_cache_updated_at ON public.barcode_cache;
CREATE TRIGGER barcode_cache_updated_at
  BEFORE UPDATE ON public.barcode_cache
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── updated_at on ai_output_logs (missing from v1) ─────────
ALTER TABLE public.ai_output_logs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS ai_output_logs_updated_at ON public.ai_output_logs;
CREATE TRIGGER ai_output_logs_updated_at
  BEFORE UPDATE ON public.ai_output_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_food_logs_child_logged_at  ON public.food_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_child_meal_type  ON public.food_logs(child_id, meal_type);
CREATE INDEX IF NOT EXISTS idx_children_user_id           ON public.children(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_child_recorded_at   ON public.growth_records(child_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_child_logged_at      ON public.sleep_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_wins_child_logged_at       ON public.wins(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_hydration_child_logged_at  ON public.hydration_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_newborn_child_logged_at    ON public.newborn_feed_logs(child_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_child_at      ON public.appointments(child_id, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_distress_user_flagged_at   ON public.distress_flags(user_id, flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created_at    ON public.ai_output_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_child_logged_at ON public.supplement_logs(child_id, logged_at DESC);

-- ── Research view (consented data only, no identifiers) ─────
CREATE OR REPLACE VIEW public.research_dataset AS
SELECT
  CASE
    WHEN (EXTRACT(YEAR FROM AGE(NOW(), c.date_of_birth::date)) * 12
         + EXTRACT(MONTH FROM AGE(NOW(), c.date_of_birth::date))) < 7   THEN '0-6m'
    WHEN (EXTRACT(YEAR FROM AGE(NOW(), c.date_of_birth::date)) * 12
         + EXTRACT(MONTH FROM AGE(NOW(), c.date_of_birth::date))) < 13  THEN '7-12m'
    WHEN (EXTRACT(YEAR FROM AGE(NOW(), c.date_of_birth::date)) * 12
         + EXTRACT(MONTH FROM AGE(NOW(), c.date_of_birth::date))) < 37  THEN '1-3y'
    WHEN (EXTRACT(YEAR FROM AGE(NOW(), c.date_of_birth::date)) * 12
         + EXTRACT(MONTH FROM AGE(NOW(), c.date_of_birth::date))) < 73  THEN '3-6y'
    ELSE '6y+'
  END                                               AS age_band,
  c.sex,
  f.season,
  p.country,
  ROUND(AVG(f.calories_kcal)::numeric, 1)          AS avg_calories_kcal,
  ROUND(AVG(f.protein_g)::numeric, 2)              AS avg_protein_g,
  ROUND(AVG(f.carbs_g)::numeric, 2)               AS avg_carbs_g,
  ROUND(AVG(f.fat_g)::numeric, 2)                 AS avg_fat_g,
  ROUND(AVG(f.iron_mg)::numeric, 3)               AS avg_iron_mg,
  ROUND(AVG(f.calcium_mg)::numeric, 1)            AS avg_calcium_mg,
  ROUND(AVG(f.vitamin_d_mcg)::numeric, 2)         AS avg_vitamin_d_mcg,
  c.is_selective_eater,
  COUNT(DISTINCT f.id)                             AS log_count,
  COUNT(DISTINCT DATE(f.logged_at))               AS days_logged
FROM  public.food_logs  f
JOIN  public.children   c ON c.id = f.child_id
JOIN  public.profiles   p ON p.id = c.user_id
WHERE p.consent_data_research = true
  AND f.is_hard_food_day = false
  AND f.food_name IS NOT NULL
GROUP BY age_band, c.sex, f.season, p.country, c.is_selective_eater;

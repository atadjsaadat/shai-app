-- Add level column to distress_flags (was missing, causing silent insert failures)
-- Add in-moment coparent consent column
ALTER TABLE distress_flags
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS in_moment_consent_coparent boolean DEFAULT false;

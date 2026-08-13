ALTER TABLE children
  ADD COLUMN IF NOT EXISTS leaps_surfaced integer[] NOT NULL DEFAULT '{}';

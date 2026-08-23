ALTER TABLE appointments ADD COLUMN IF NOT EXISTS vaccine_keys text[] DEFAULT '{}';

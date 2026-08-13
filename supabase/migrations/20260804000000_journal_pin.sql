-- Journal PIN lock
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS journal_pin_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS journal_lock_enabled BOOLEAN NOT NULL DEFAULT FALSE;

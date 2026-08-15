-- Performance indexes for production scale
-- Every high-frequency query path covered: child lookup, food logs, feeds, wins, growth, sleep, hydration, supplements, appointments, distress

-- children: looked up by user_id on almost every API call (29 occurrences)
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- food_logs: filtered by child + date range on every trends/home/log fetch
CREATE INDEX IF NOT EXISTS idx_food_logs_child_logged ON food_logs(child_id, logged_at DESC);

-- newborn_feed_logs: same pattern as food_logs
CREATE INDEX IF NOT EXISTS idx_newborn_feed_logs_child_logged ON newborn_feed_logs(child_id, logged_at DESC);

-- wins: filtered by child + ordered by date
CREATE INDEX IF NOT EXISTS idx_wins_child_logged ON wins(child_id, logged_at DESC);

-- growth_records: filtered by child + ordered by recorded_at
CREATE INDEX IF NOT EXISTS idx_growth_records_child_recorded ON growth_records(child_id, recorded_at DESC);

-- sleep_logs: filtered by child + date
CREATE INDEX IF NOT EXISTS idx_sleep_logs_child_logged ON sleep_logs(child_id, logged_at DESC);

-- hydration_logs: filtered by child + date
CREATE INDEX IF NOT EXISTS idx_hydration_logs_child_logged ON hydration_logs(child_id, logged_at DESC);

-- supplement_logs: filtered by child + date
CREATE INDEX IF NOT EXISTS idx_supplement_logs_child_logged ON supplement_logs(child_id, logged_at DESC);

-- appointments: filtered by child + ordered by scheduled_at
CREATE INDEX IF NOT EXISTS idx_appointments_child_scheduled ON appointments(child_id, scheduled_at DESC);

-- distress_flags: filtered by user_id (welfare monitoring queries)
CREATE INDEX IF NOT EXISTS idx_distress_flags_user_id ON distress_flags(user_id);

-- ai_output_logs: filtered by user_id for cost monitoring
CREATE INDEX IF NOT EXISTS idx_ai_output_logs_user_id ON ai_output_logs(user_id);

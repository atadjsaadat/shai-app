alter table growth_records
  add column if not exists head_cm numeric(5,1),
  add column if not exists who_head_percentile numeric(5,1);

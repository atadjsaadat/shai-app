create table if not exists barcode_audit_flags (
  id           uuid        default gen_random_uuid() primary key,
  barcode      text        not null,
  product_name text,
  flag_reason  text        not null,  -- MACRO_MISMATCH | UNKNOWN_NAME_NOT_IN_OFF | MISSING_CALORIES_NOT_IN_OFF
  flag_detail  text,
  flagged_at   timestamptz not null default now(),
  resolved     boolean     not null default false,
  resolved_at  timestamptz,
  updated_at   timestamptz not null default now()
);

create index if not exists barcode_audit_flags_barcode_idx  on barcode_audit_flags (barcode);
create index if not exists barcode_audit_flags_unresolved_idx on barcode_audit_flags (resolved) where not resolved;

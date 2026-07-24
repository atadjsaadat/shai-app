-- Test user for local development
-- Email: atadjsaadat@yahoo.com / Password: SHAiTest2026!
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'atadjsaadat@yahoo.com',
  crypt('SHAiTest2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', '', '',
  now(), now()
)
ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0001-000000000001',
  'atadjsaadat@yahoo.com',
  'email',
  '{"sub":"00000000-0000-0000-0001-000000000001","email":"atadjsaadat@yahoo.com"}',
  now(), now(), now()
)
ON CONFLICT DO NOTHING;

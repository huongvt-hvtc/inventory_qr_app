-- ================================================================
-- DEBUG USER CREATION - Check what's happening
-- ================================================================

-- 1. Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- 2. Check existing users
SELECT id, email, name, created_at FROM users ORDER BY created_at DESC;

-- 3. Check auth.users (to see if users exist in auth but not in our table)
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- 4. Manually create user for testing
INSERT INTO users (id, email, name, picture, google_id, role)
VALUES (
  gen_random_uuid(),
  'manual-test@example.com',
  'Manual Test User',
  null,
  'manual123',
  'user'
) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;

-- 5. Check if manual creation worked
SELECT * FROM users WHERE email = 'manual-test@example.com';
-- ================================================================
-- FIX USER CREATION - Ensure new users are created properly
-- ================================================================

-- First, check if trigger exists and is working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create improved function that handles all cases
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution (for debugging)
  RAISE NOTICE 'Creating user for email: %', NEW.email;

  -- Insert new user with proper error handling
  INSERT INTO users (
    id,
    email,
    name,
    picture,
    google_id,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)  -- Use email prefix as fallback
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id',
    'user',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    picture = EXCLUDED.picture,
    google_id = EXCLUDED.google_id,
    updated_at = NOW();

  -- Also handle email conflicts
  DELETE FROM users WHERE email = NEW.email AND id != NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE NOTICE 'Error creating user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Enable the trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Test by manually creating a user entry (for testing)
-- You can uncomment this to test with a dummy user
/*
INSERT INTO users (id, email, name, picture, google_id, role)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  null,
  'test123',
  'user'
) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
*/

-- ================================================================
-- VERIFICATION QUERY - Run this to check if trigger is working
-- ================================================================
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- Check existing users
SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 5;
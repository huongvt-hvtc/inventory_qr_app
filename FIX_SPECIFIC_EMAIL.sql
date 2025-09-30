-- ================================================================
-- FIX SPECIFIC EMAIL - Remove conflicting record
-- ================================================================

-- Remove specific email from users table
DELETE FROM users WHERE email = 'mr.ngoctmn@gmail.com';

-- Remove from auth.users if possible (may need admin rights)
-- DELETE FROM auth.users WHERE email = 'mr.ngoctmn@gmail.com';

-- Update function to handle duplicate gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, picture, google_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    picture = EXCLUDED.picture,
    google_id = EXCLUDED.google_id,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also handle email conflicts
CREATE OR REPLACE FUNCTION handle_new_user_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing record with same email first
  DELETE FROM users WHERE email = NEW.email AND id != NEW.id;

  -- Then insert/update
  INSERT INTO users (id, email, name, picture, google_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    picture = EXCLUDED.picture,
    google_id = EXCLUDED.google_id,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to use safe function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_safe();
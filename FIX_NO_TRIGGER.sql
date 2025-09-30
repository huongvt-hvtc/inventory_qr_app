-- ================================================================
-- FIX WITHOUT TRIGGER - Manual user creation approach
-- ================================================================

-- Instead of using triggers (which need special permissions),
-- we'll handle user creation in the app code directly

-- First, ensure our users table is ready
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  google_id TEXT UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for simplicity (since we can't create complex policies)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Remove any existing triggers (if any)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create a simple function that can be called manually
CREATE OR REPLACE FUNCTION create_user_if_not_exists(
  user_id UUID,
  user_email TEXT,
  user_name TEXT DEFAULT NULL,
  user_picture TEXT DEFAULT NULL,
  user_google_id TEXT DEFAULT NULL
)
RETURNS users AS $$
DECLARE
  result users;
BEGIN
  -- Try to insert, update if exists
  INSERT INTO users (id, email, name, picture, google_id, role)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    user_picture,
    user_google_id,
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    picture = COALESCE(EXCLUDED.picture, users.picture),
    google_id = COALESCE(EXCLUDED.google_id, users.google_id),
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_if_not_exists TO authenticated;
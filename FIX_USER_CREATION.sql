-- ================================================================
-- FIX USER CREATION - Resilient sync between auth.users and users
-- ================================================================
-- Run this script in the Supabase SQL editor.
-- It recreates the trigger/function that mirrors auth users into
-- the public.users table and safely resolves legacy duplicates.
-- ================================================================

-- Remove previous trigger/function versions so we start clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sync_user_from_auth(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

-- Helper function that encapsulates the sync logic so we can call it
-- from both the trigger and ad-hoc maintenance jobs.
CREATE OR REPLACE FUNCTION public.sync_user_from_auth(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_picture TEXT DEFAULT NULL,
  p_google_id TEXT DEFAULT NULL,
  p_created_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS users
AS $$
DECLARE
  existing_by_id users%ROWTYPE;
  existing_by_email users%ROWTYPE;
  fk RECORD;
  result_row users%ROWTYPE;
BEGIN
  -- Case 1: we already have a row for this auth user id, just keep it fresh
  SELECT * INTO existing_by_id FROM users WHERE id = p_id;

  IF FOUND THEN
    UPDATE users
      SET email = p_email,
          name = p_name,
          picture = p_picture,
          google_id = COALESCE(p_google_id, users.google_id),
          updated_at = NOW()
      WHERE id = p_id
      RETURNING * INTO result_row;

    RETURN result_row;
  END IF;

  -- Case 2: same email exists but with an old id (common when auth.users was reset)
  SELECT * INTO existing_by_email FROM users WHERE email = p_email LIMIT 1;

  IF FOUND THEN
    IF existing_by_email.id <> p_id THEN
      -- Update every foreign key that still points at the legacy id
      FOR fk IN
        SELECT tc.table_schema,
               tc.table_name,
               kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = 'public'
          AND ccu.table_name = 'users'
          AND ccu.column_name = 'id'
      LOOP
        EXECUTE format(
          'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
          fk.table_schema,
          fk.table_name,
          fk.column_name,
          fk.column_name
        )
        USING p_id, existing_by_email.id;
      END LOOP;
    END IF;

    UPDATE users
      SET id = p_id,
          email = p_email,
          name = p_name,
          picture = p_picture,
          google_id = COALESCE(p_google_id, existing_by_email.google_id),
          role = COALESCE(existing_by_email.role, 'user'),
          created_at = COALESCE(existing_by_email.created_at, p_created_at),
          updated_at = NOW()
      WHERE id = existing_by_email.id
      RETURNING * INTO result_row;

    RETURN result_row;
  END IF;

  -- Case 3: brand new email, insert a fresh profile row
  INSERT INTO users (id, email, name, picture, google_id, role, created_at, updated_at)
  VALUES (p_id, p_email, p_name, p_picture, p_google_id, 'user', COALESCE(p_created_at, NOW()), NOW())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        google_id = COALESCE(EXCLUDED.google_id, users.google_id),
        updated_at = NOW()
  RETURNING * INTO result_row;

  RETURN result_row;
EXCEPTION
  WHEN others THEN
    -- Never block auth sign-in because of data issues – log and continue
    RAISE NOTICE 'sync_user_from_auth fallback: %', SQLERRM;
    RETURN existing_by_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

GRANT EXECUTE ON FUNCTION public.sync_user_from_auth(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_from_auth(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- Trigger function that delegates to the helper
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
AS $$
BEGIN
  PERFORM sync_user_from_auth(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'provider_id', NEW.raw_user_meta_data->>'sub'),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Recreate the trigger with the new helper
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Make sure the basic RLS policies exist so users can manage their profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_insert_self'
  ) THEN
    CREATE POLICY users_insert_self ON users
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_select_self'
  ) THEN
    CREATE POLICY users_select_self ON users
      FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_update_self'
  ) THEN
    CREATE POLICY users_update_self ON users
      FOR UPDATE USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END;
$$;

-- Backfill existing auth users so the latest ids are synced immediately
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN
    SELECT
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) AS name,
      COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture') AS picture,
      COALESCE(au.raw_user_meta_data->>'provider_id', au.raw_user_meta_data->>'sub') AS google_id,
      au.created_at
    FROM auth.users au
  LOOP
    PERFORM sync_user_from_auth(
      auth_user.id,
      auth_user.email,
      auth_user.name,
      auth_user.picture,
      auth_user.google_id,
      auth_user.created_at
    );
  END LOOP;
END;
$$;

-- ================================================================
-- End of script
-- ================================================================

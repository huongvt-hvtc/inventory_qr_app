-- ================================================================
-- ASSET ACCESS RESET - Allow any authenticated user to manage assets
-- Run this script once in the Supabase SQL editor.
-- ================================================================

BEGIN;

-- 1. Ensure schema matches application expectations
ALTER TABLE assets ADD COLUMN IF NOT EXISTS qr_generated BOOLEAN DEFAULT false;
ALTER TABLE assets ALTER COLUMN qr_generated SET DEFAULT false;
UPDATE assets SET qr_generated = COALESCE(qr_generated, false);

-- 2. Loosen created_by so it is optional and not constrained
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_created_by_fkey;
ALTER TABLE assets ALTER COLUMN created_by DROP NOT NULL;

-- Optional: if legacy UUID strings got stored, clear them since we no longer track creator
UPDATE assets SET created_by = NULL WHERE created_by IS NOT NULL;

-- 3. Rebuild simple RLS policies: authenticated users can CRUD everything
DROP POLICY IF EXISTS "assets_select_policy" ON assets;
DROP POLICY IF EXISTS "assets_insert_policy" ON assets;
DROP POLICY IF EXISTS "assets_update_policy" ON assets;
DROP POLICY IF EXISTS "assets_delete_policy" ON assets;

CREATE POLICY "assets_select_policy" ON assets
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "assets_insert_policy" ON assets
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "assets_update_policy" ON assets
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "assets_delete_policy" ON assets
  FOR DELETE
  USING (auth.role() = 'authenticated');

COMMIT;

-- ================================================================
-- End of script
-- ================================================================

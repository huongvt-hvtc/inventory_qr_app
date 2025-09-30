-- ================================================================
-- UPDATE SCAN HISTORY FUNCTION
-- Fix query to return all scans, not just distinct per asset
-- ================================================================

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION get_recent_scans(user_email_param TEXT, limit_count INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  asset_id UUID,
  asset_code TEXT,
  name TEXT,
  model TEXT,
  serial TEXT,
  tech_code TEXT,
  department TEXT,
  status TEXT,
  location TEXT,
  notes TEXT,
  is_checked BOOLEAN,
  checked_by TEXT,
  checked_at TIMESTAMP WITH TIME ZONE,
  scanned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sh.id,
    a.id as asset_id,
    a.asset_code,
    a.name,
    a.model,
    a.serial,
    a.tech_code,
    a.department,
    a.status,
    a.location,
    a.notes,
    EXISTS(
      SELECT 1 FROM inventory_records ir
      WHERE ir.asset_id = a.id
      LIMIT 1
    ) as is_checked,
    (SELECT ir.checked_by FROM inventory_records ir
     WHERE ir.asset_id = a.id
     ORDER BY ir.checked_at DESC
     LIMIT 1) as checked_by,
    (SELECT ir.checked_at FROM inventory_records ir
     WHERE ir.asset_id = a.id
     ORDER BY ir.checked_at DESC
     LIMIT 1) as checked_at,
    sh.scanned_at
  FROM scan_history sh
  INNER JOIN assets a ON sh.asset_id = a.id
  WHERE sh.user_email = user_email_param
  ORDER BY sh.scanned_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Updated get_recent_scans function successfully!';
  RAISE NOTICE '📝 Now returns all scans ordered by scan time (newest first)';
END $$;
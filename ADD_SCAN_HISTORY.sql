-- ================================================================
-- ADD SCAN HISTORY TABLE
-- For tracking recent scans per user across devices
-- ================================================================

-- Create scan_history table
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_history_user_email ON scan_history(user_email);
CREATE INDEX IF NOT EXISTS idx_scan_history_asset_id ON scan_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON scan_history(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_user_scanned ON scan_history(user_email, scanned_at DESC);

-- Enable RLS
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own scan history
CREATE POLICY "Users can view their own scan history"
  ON scan_history
  FOR SELECT
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can insert their own scan history"
  ON scan_history
  FOR INSERT
  WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can delete their own scan history"
  ON scan_history
  FOR DELETE
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Function to get recent scans with asset details
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

-- Function to add scan to history (with deduplication)
CREATE OR REPLACE FUNCTION add_scan_to_history(
  user_email_param TEXT,
  asset_id_param UUID
)
RETURNS UUID AS $$
DECLARE
  scan_id UUID;
  asset_code_val TEXT;
BEGIN
  -- Get asset code
  SELECT asset_code INTO asset_code_val FROM assets WHERE id = asset_id_param;

  IF asset_code_val IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  -- Insert new scan record
  INSERT INTO scan_history (user_email, asset_id, asset_code, scanned_at)
  VALUES (user_email_param, asset_id_param, asset_code_val, NOW())
  RETURNING id INTO scan_id;

  -- Clean up old records (keep only last 50 per user)
  DELETE FROM scan_history
  WHERE id IN (
    SELECT id FROM scan_history
    WHERE user_email = user_email_param
    ORDER BY scanned_at DESC
    OFFSET 50
  );

  RETURN scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON scan_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_scans TO authenticated;
GRANT EXECUTE ON FUNCTION add_scan_to_history TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Scan history table and functions created successfully!';
  RAISE NOTICE '📊 Users can now track their scan history across devices';
END $$;
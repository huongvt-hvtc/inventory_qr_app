-- ============================================
-- EMAIL-BASED LICENSE SYSTEM - COMPLETE SCHEMA
-- Version 2.0 - Multi-company with Email License
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: EMAIL LICENSE TABLES
-- ============================================

-- Drop old tables if migrating from key-based system
DROP TABLE IF EXISTS license_activity_logs CASCADE;
DROP TABLE IF EXISTS company_members CASCADE;
DROP TABLE IF EXISTS license_keys CASCADE;

-- Create new licenses table (email-based)
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT UNIQUE NOT NULL, -- Primary email that owns the license

  -- Subscription Details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'max', 'enterprise')),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),

  -- Plan Limits
  max_companies INTEGER NOT NULL DEFAULT 3,
  max_users INTEGER NOT NULL DEFAULT 999, 
  max_assets INTEGER NOT NULL DEFAULT 99999,
  max_members INTEGER NOT NULL DEFAULT 5, -- Total members allowed

  -- Current Usage (auto-updated by triggers)
  current_companies INTEGER DEFAULT 0,
  current_users INTEGER DEFAULT 0,
  current_assets INTEGER DEFAULT 0,
  current_members INTEGER DEFAULT 1, -- Owner counts as 1

  -- Billing
  price INTEGER DEFAULT 0,
  notes TEXT,

  -- Features (JSON)
  features JSONB DEFAULT '{}',

  -- Tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_api_calls INTEGER DEFAULT 0,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- License members table (users who share the license)
CREATE TABLE IF NOT EXISTS license_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Tracking
  invited_by TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(license_id, email)
);

-- Companies table (each license can have multiple companies)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  created_by TEXT, -- Email of creator
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(license_id, name)
);

-- Company permissions (which member can access which company)
CREATE TABLE IF NOT EXISTS company_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  license_member_id UUID REFERENCES license_members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'member', 'viewer')),
  
  -- Tracking
  granted_by TEXT, -- Email who granted
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(company_id, license_member_id)
);

-- Update assets table to support companies
ALTER TABLE assets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(owner_email);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_license_members_license ON license_members(license_id);
CREATE INDEX IF NOT EXISTS idx_license_members_email ON license_members(email);
CREATE INDEX IF NOT EXISTS idx_companies_license ON companies(license_id);
CREATE INDEX IF NOT EXISTS idx_company_permissions_company ON company_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_permissions_member ON company_permissions(license_member_id);
CREATE INDEX IF NOT EXISTS idx_assets_company ON assets(company_id);

-- ============================================
-- PART 2: AUTO-UPDATE FUNCTIONS
-- ============================================

-- Function to update license usage counters
CREATE OR REPLACE FUNCTION update_license_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_license_id UUID;
BEGIN
  -- Get license_id based on table
  IF TG_TABLE_NAME = 'companies' THEN
    v_license_id := COALESCE(NEW.license_id, OLD.license_id);
  ELSIF TG_TABLE_NAME = 'license_members' THEN
    v_license_id := COALESCE(NEW.license_id, OLD.license_id);
  ELSIF TG_TABLE_NAME = 'assets' THEN
    SELECT c.license_id INTO v_license_id
    FROM companies c
    WHERE c.id = COALESCE(NEW.company_id, OLD.company_id);
  END IF;

  -- Update counters
  IF v_license_id IS NOT NULL THEN
    UPDATE licenses SET
      current_companies = (SELECT COUNT(*) FROM companies WHERE license_id = v_license_id),
      current_members = (SELECT COUNT(*) FROM license_members WHERE license_id = v_license_id),
      current_assets = (
        SELECT COUNT(*) FROM assets a
        JOIN companies c ON c.id = a.company_id
        WHERE c.license_id = v_license_id
      ),
      last_used_at = NOW()
    WHERE id = v_license_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_license_on_companies ON companies;
CREATE TRIGGER update_license_on_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_license_usage();

DROP TRIGGER IF EXISTS update_license_on_members ON license_members;
CREATE TRIGGER update_license_on_members
  AFTER INSERT OR UPDATE OR DELETE ON license_members
  FOR EACH ROW EXECUTE FUNCTION update_license_usage();

DROP TRIGGER IF EXISTS update_license_on_assets ON assets;
CREATE TRIGGER update_license_on_assets
  AFTER INSERT OR UPDATE OR DELETE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_license_usage();

-- Function to auto-expire licenses
CREATE OR REPLACE FUNCTION check_license_expiry()
RETURNS void AS $$
BEGIN
  UPDATE licenses
  SET status = 'expired'
  WHERE status = 'active'
    AND valid_until < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 3: ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_permissions ENABLE ROW LEVEL SECURITY;

-- Licenses policies
CREATE POLICY "licenses_view_own" ON licenses
  FOR SELECT USING (
    owner_email = (SELECT email FROM users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM license_members 
      WHERE license_id = licenses.id 
        AND email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "licenses_manage_own" ON licenses
  FOR ALL USING (
    owner_email = (SELECT email FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- License members policies
CREATE POLICY "members_view_same_license" ON license_members
  FOR SELECT USING (
    license_id IN (
      SELECT id FROM licenses 
      WHERE owner_email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR license_id IN (
      SELECT license_id FROM license_members 
      WHERE email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "members_manage_by_owner" ON license_members
  FOR ALL USING (
    license_id IN (
      SELECT id FROM licenses 
      WHERE owner_email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Companies policies
CREATE POLICY "companies_view_authorized" ON companies
  FOR SELECT USING (
    license_id IN (
      SELECT id FROM licenses 
      WHERE owner_email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM company_permissions cp
      JOIN license_members lm ON lm.id = cp.license_member_id
      WHERE cp.company_id = companies.id
        AND lm.email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "companies_manage_by_owner" ON companies
  FOR ALL USING (
    license_id IN (
      SELECT id FROM licenses 
      WHERE owner_email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Company permissions policies
CREATE POLICY "permissions_view_own" ON company_permissions
  FOR SELECT USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN licenses l ON l.id = c.license_id
      WHERE l.owner_email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR license_member_id IN (
      SELECT id FROM license_members 
      WHERE email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "permissions_manage_by_owner" ON company_permissions
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN licenses l ON l.id = c.license_id
      WHERE l.owner_email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Assets policies (update existing)
DROP POLICY IF EXISTS "assets_company_access" ON assets;
CREATE POLICY "assets_company_access" ON assets
  FOR ALL USING (
    company_id IN (
      SELECT c.id FROM companies c
      JOIN licenses l ON l.id = c.license_id
      WHERE l.owner_email = (SELECT email FROM users WHERE id = auth.uid())
    )
    OR company_id IN (
      SELECT cp.company_id FROM company_permissions cp
      JOIN license_members lm ON lm.id = cp.license_member_id
      WHERE lm.email = (SELECT email FROM users WHERE id = auth.uid())
        AND cp.role IN ('admin', 'member', 'viewer')
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- PART 4: HELPER FUNCTIONS
-- ============================================

-- Function to get license info for a user
CREATE OR REPLACE FUNCTION get_user_license_info(p_email TEXT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'license', row_to_json(l.*),
    'companies', (
      SELECT json_agg(row_to_json(c.*))
      FROM companies c
      WHERE c.license_id = l.id
    ),
    'members', (
      SELECT json_agg(row_to_json(lm.*))
      FROM license_members lm
      WHERE lm.license_id = l.id
    )
  ) INTO v_result
  FROM licenses l
  WHERE l.owner_email = p_email
    OR l.id IN (
      SELECT license_id FROM license_members 
      WHERE email = p_email AND status = 'active'
    )
  LIMIT 1;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON licenses TO authenticated;
GRANT ALL ON license_members TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON company_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_license_info TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Email License System schema created successfully!';
  RAISE NOTICE 'Tables created: licenses, license_members, companies, company_permissions';
  RAISE NOTICE 'Next step: Create admin user with: UPDATE users SET role = ''admin'' WHERE email = ''your-admin@email.com'';';
END $$;

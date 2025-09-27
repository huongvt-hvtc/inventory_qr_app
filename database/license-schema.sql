-- License Key Subscription System Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- License keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_code TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  customer_email TEXT,

  -- Usage Limits
  max_companies INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 10,
  max_assets INTEGER DEFAULT 1000,

  -- Current Usage (auto-updated)
  current_companies INTEGER DEFAULT 0,
  current_users INTEGER DEFAULT 0,
  current_assets INTEGER DEFAULT 0,

  -- Subscription Details
  plan_type TEXT NOT NULL, -- 'basic', 'pro', 'enterprise'
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'suspended'

  -- Features (JSON)
  features JSONB DEFAULT '{}',

  -- Tracking
  last_used_at TIMESTAMP,
  total_api_calls INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Companies table (enhanced)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  license_key_id UUID REFERENCES license_keys(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Company memberships (users in companies)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'

  -- Tracking
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, user_id)
);

-- License activity logs
CREATE TABLE IF NOT EXISTS license_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_key_id UUID REFERENCES license_keys(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  action TEXT NOT NULL, -- 'company_added', 'user_added', 'asset_created', 'api_call'
  details JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP DEFAULT NOW()
);

-- Update existing assets table to include company_id
ALTER TABLE assets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_valid_until ON license_keys(valid_until);
CREATE INDEX IF NOT EXISTS idx_companies_license_key ON companies(license_key_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_company ON assets(company_id);
CREATE INDEX IF NOT EXISTS idx_license_activity_logs_license ON license_activity_logs(license_key_id);

-- Function to update license usage counters
CREATE OR REPLACE FUNCTION update_license_usage_counters()
RETURNS TRIGGER AS $$
DECLARE
  license_id UUID;
BEGIN
  -- Get license key ID from company
  IF TG_TABLE_NAME = 'companies' THEN
    license_id := COALESCE(NEW.license_key_id, OLD.license_key_id);
  ELSIF TG_TABLE_NAME = 'company_members' THEN
    SELECT c.license_key_id INTO license_id
    FROM companies c
    WHERE c.id = COALESCE(NEW.company_id, OLD.company_id);
  ELSIF TG_TABLE_NAME = 'assets' THEN
    SELECT c.license_key_id INTO license_id
    FROM companies c
    WHERE c.id = COALESCE(NEW.company_id, OLD.company_id);
  END IF;

  -- Update license counters if license exists
  IF license_id IS NOT NULL THEN
    UPDATE license_keys SET
      current_companies = (
        SELECT COUNT(*) FROM companies
        WHERE license_key_id = license_id
      ),
      current_users = (
        SELECT COUNT(DISTINCT cm.user_id)
        FROM company_members cm
        JOIN companies c ON c.id = cm.company_id
        WHERE c.license_key_id = license_id
      ),
      current_assets = (
        SELECT COUNT(*)
        FROM assets a
        JOIN companies c ON c.id = a.company_id
        WHERE c.license_key_id = license_id
      ),
      last_used_at = NOW()
    WHERE id = license_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update counters
DROP TRIGGER IF EXISTS trigger_update_license_companies ON companies;
CREATE TRIGGER trigger_update_license_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_license_usage_counters();

DROP TRIGGER IF EXISTS trigger_update_license_users ON company_members;
CREATE TRIGGER trigger_update_license_users
  AFTER INSERT OR UPDATE OR DELETE ON company_members
  FOR EACH ROW EXECUTE FUNCTION update_license_usage_counters();

DROP TRIGGER IF EXISTS trigger_update_license_assets ON assets;
CREATE TRIGGER trigger_update_license_assets
  AFTER INSERT OR UPDATE OR DELETE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_license_usage_counters();

-- Function to activate a license key
CREATE OR REPLACE FUNCTION activate_license_key(
  p_key_code TEXT,
  p_company_name TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  license_record RECORD;
  company_id UUID;
  result JSON;
BEGIN
  -- Validate license key
  SELECT * INTO license_record
  FROM license_keys
  WHERE key_code = p_key_code
    AND status = 'active'
    AND valid_from <= CURRENT_DATE
    AND valid_until >= CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired license key');
  END IF;

  -- Check if license already has max companies
  IF license_record.current_companies >= license_record.max_companies THEN
    RETURN json_build_object('success', false, 'error', 'License has reached maximum number of companies');
  END IF;

  -- Create company
  INSERT INTO companies (name, owner_id, license_key_id)
  VALUES (p_company_name, p_user_id, license_record.id)
  RETURNING id INTO company_id;

  -- Add user as company owner
  INSERT INTO company_members (company_id, user_id, role, invited_by)
  VALUES (company_id, p_user_id, 'owner', p_user_id);

  -- Log the activation
  INSERT INTO license_activity_logs (license_key_id, company_id, action, details, performed_by)
  VALUES (
    license_record.id,
    company_id,
    'license_activated',
    json_build_object('company_name', p_company_name),
    p_user_id
  );

  RETURN json_build_object(
    'success', true,
    'company_id', company_id,
    'license_id', license_record.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get company license info
CREATE OR REPLACE FUNCTION get_company_license_info(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'license', json_build_object(
      'key_code', lk.key_code,
      'plan_type', lk.plan_type,
      'valid_until', lk.valid_until,
      'status', lk.status,
      'features', lk.features
    ),
    'usage', json_build_object(
      'companies', json_build_object(
        'current', lk.current_companies,
        'max', lk.max_companies
      ),
      'users', json_build_object(
        'current', lk.current_users,
        'max', lk.max_users
      ),
      'assets', json_build_object(
        'current', lk.current_assets,
        'max', lk.max_assets
      )
    )
  ) INTO result
  FROM companies c
  JOIN license_keys lk ON lk.id = c.license_key_id
  WHERE c.id = p_company_id;

  RETURN COALESCE(result, json_build_object('error', 'No license found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_activity_logs ENABLE ROW LEVEL SECURITY;

-- License keys: Only admins can see all, users can see their own company's license
CREATE POLICY "license_keys_select" ON license_keys
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin' OR
  id IN (
    SELECT c.license_key_id
    FROM companies c
    JOIN company_members cm ON cm.company_id = c.id
    WHERE cm.user_id = auth.uid()
  )
);

-- Companies: Users can only see companies they belong to
CREATE POLICY "companies_select" ON companies
FOR SELECT USING (
  id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "companies_insert" ON companies
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "companies_update" ON companies
FOR UPDATE USING (
  id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Company members: Users can see members of their companies
CREATE POLICY "company_members_select" ON company_members
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "company_members_insert" ON company_members
FOR INSERT WITH CHECK (
  company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Assets: Users can only see assets from their companies
CREATE POLICY "assets_company_access" ON assets
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  )
);

-- Activity logs: Users can see logs for their companies
CREATE POLICY "license_activity_logs_select" ON license_activity_logs
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM company_members
    WHERE user_id = auth.uid()
  )
);

-- Create default admin user role
-- You'll need to update this with your admin user ID
-- UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
-- WHERE email = 'your-admin@email.com';
-- ================================================================
-- INVENTORY QR APP - COMPLETE DATABASE SCHEMA v2.0
-- Email-based License System with Multi-Company Support
-- ================================================================
-- Run this complete script in Supabase SQL Editor
-- This creates all tables, functions, and policies from scratch
-- ================================================================

-- Enable required extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- SECTION 0: CLEAN UP (Optional - comment out if fresh install)
-- ================================================================
-- Only run this section if you need to reset existing schema
-- WARNING: This will DELETE all data!

/*
-- Uncomment below lines only if you want to completely reset

-- Drop all policies first
DROP POLICY IF EXISTS "users_view_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "assets_access" ON assets;
DROP POLICY IF EXISTS "inventory_access" ON inventory_records;
DROP POLICY IF EXISTS "activity_view_own" ON activity_logs;
DROP POLICY IF EXISTS "activity_insert" ON activity_logs;
DROP POLICY IF EXISTS "licenses_view" ON licenses;
DROP POLICY IF EXISTS "licenses_manage" ON licenses;
DROP POLICY IF EXISTS "members_view" ON license_members;
DROP POLICY IF EXISTS "members_manage" ON license_members;
DROP POLICY IF EXISTS "companies_view" ON companies;
DROP POLICY IF EXISTS "companies_manage" ON companies;
DROP POLICY IF EXISTS "permissions_view" ON company_permissions;
DROP POLICY IF EXISTS "permissions_manage" ON company_permissions;
DROP POLICY IF EXISTS "sessions_view" ON user_sessions;
DROP POLICY IF EXISTS "sessions_manage" ON user_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_license_info(text) CASCADE;
DROP FUNCTION IF EXISTS validate_session_limit(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS force_new_session(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS update_session_activity(text) CASCADE;
DROP FUNCTION IF EXISTS update_license_usage() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
DROP TRIGGER IF EXISTS update_licenses_updated_at ON licenses;
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP TRIGGER IF EXISTS update_license_on_companies ON companies;
DROP TRIGGER IF EXISTS update_license_on_members ON license_members;
DROP TRIGGER IF EXISTS update_license_on_assets ON assets;

-- Drop tables in correct order (foreign key dependencies)
DROP TABLE IF EXISTS company_permissions CASCADE;
DROP TABLE IF EXISTS inventory_records CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS license_members CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
*/

-- ================================================================
-- SECTION 1: CREATE CORE TABLES
-- ================================================================

-- 1. Users table (foundation - create first)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  google_id TEXT UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Licenses table (no dependencies)
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'max', 'enterprise')),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  max_companies INTEGER NOT NULL DEFAULT 3,
  max_users INTEGER NOT NULL DEFAULT 999,
  max_assets INTEGER NOT NULL DEFAULT 99999,
  max_members INTEGER NOT NULL DEFAULT 5,
  current_companies INTEGER DEFAULT 0,
  current_users INTEGER DEFAULT 0,
  current_assets INTEGER DEFAULT 0,
  current_members INTEGER DEFAULT 1,
  price INTEGER DEFAULT 0,
  notes TEXT,
  features JSONB DEFAULT '{}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_api_calls INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. License members (depends on licenses)
CREATE TABLE IF NOT EXISTS license_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  invited_by TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(license_id, email)
);

-- 4. Companies (depends on licenses)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(license_id, name)
);

-- 5. Company permissions (depends on companies and license_members)
CREATE TABLE IF NOT EXISTS company_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  license_member_id UUID REFERENCES license_members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'member', 'viewer')),
  granted_by TEXT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, license_member_id)
);

-- 6. Assets (depends on companies)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  asset_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  serial TEXT,
  tech_code TEXT,
  department TEXT,
  status TEXT,
  location TEXT,
  notes TEXT,
  qr_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Inventory records (depends on assets)
CREATE TABLE IF NOT EXISTS inventory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  checked_by TEXT NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  location_found TEXT,
  condition_found TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Activity logs (depends on users)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. User sessions (no foreign keys)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
  device_info TEXT,
  session_token TEXT UNIQUE NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SECTION 2: CREATE INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_company ON assets(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_asset_id ON inventory_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(owner_email);
CREATE INDEX IF NOT EXISTS idx_license_members_license ON license_members(license_id);
CREATE INDEX IF NOT EXISTS idx_companies_license ON companies(license_id);
CREATE INDEX IF NOT EXISTS idx_company_permissions_company ON company_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- ================================================================
-- SECTION 3: CREATE FUNCTIONS
-- ================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update license usage function
CREATE OR REPLACE FUNCTION update_license_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_license_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'companies' THEN
    v_license_id := COALESCE(NEW.license_id, OLD.license_id);
  ELSIF TG_TABLE_NAME = 'license_members' THEN
    v_license_id := COALESCE(NEW.license_id, OLD.license_id);
  ELSIF TG_TABLE_NAME = 'assets' THEN
    SELECT c.license_id INTO v_license_id
    FROM companies c
    WHERE c.id = COALESCE(NEW.company_id, OLD.company_id);
  END IF;

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

-- Session validation function
CREATE OR REPLACE FUNCTION validate_session_limit(
  p_user_email TEXT,
  p_device_type TEXT,
  p_session_token TEXT,
  p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  existing_session RECORD;
BEGIN
  SELECT * INTO existing_session
  FROM user_sessions
  WHERE email = p_user_email
    AND device_type = p_device_type
    AND session_token != p_session_token
    AND last_active_at > NOW() - INTERVAL '24 hours';

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Bạn đã đăng nhập trên %s khác', 
        CASE p_device_type 
          WHEN 'mobile' THEN 'thiết bị di động'
          ELSE 'máy tính'
        END),
      'existing_session', json_build_object(
        'device_info', existing_session.device_info,
        'last_active', existing_session.last_active_at
      )
    );
  END IF;

  DELETE FROM user_sessions 
  WHERE email = p_user_email 
    AND last_active_at < NOW() - INTERVAL '24 hours';

  INSERT INTO user_sessions (email, device_type, session_token, device_info)
  VALUES (p_user_email, p_device_type, p_session_token, p_device_info)
  ON CONFLICT (session_token) 
  DO UPDATE SET 
    last_active_at = NOW(),
    device_info = COALESCE(p_device_info, user_sessions.device_info);

  RETURN json_build_object('success', true, 'message', 'Session validated successfully');
END;
$$ LANGUAGE plpgsql;

-- Force new session function
CREATE OR REPLACE FUNCTION force_new_session(
  p_user_email TEXT,
  p_device_type TEXT,
  p_session_token TEXT,
  p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE email = p_user_email
    AND device_type = p_device_type
    AND session_token != p_session_token;

  INSERT INTO user_sessions (email, device_type, session_token, device_info)
  VALUES (p_user_email, p_device_type, p_session_token, p_device_info)
  ON CONFLICT (session_token) 
  DO UPDATE SET 
    last_active_at = NOW(),
    device_info = COALESCE(p_device_info, user_sessions.device_info);

  RETURN json_build_object('success', true, 'message', 'Đã chuyển sang thiết bị mới');
END;
$$ LANGUAGE plpgsql;

-- Update session activity function
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions 
  SET last_active_at = NOW()
  WHERE session_token = p_session_token;
END;
$$ LANGUAGE plpgsql;

-- Get user license info function
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

-- ================================================================
-- SECTION 4: CREATE TRIGGERS
-- ================================================================

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at 
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at 
  BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_license_on_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_license_usage();

CREATE TRIGGER update_license_on_members
  AFTER INSERT OR UPDATE OR DELETE ON license_members
  FOR EACH ROW EXECUTE FUNCTION update_license_usage();

CREATE TRIGGER update_license_on_assets
  AFTER INSERT OR UPDATE OR DELETE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_license_usage();

-- ================================================================
-- SECTION 5: ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- SECTION 6: CREATE RLS POLICIES
-- ================================================================

-- Users policies
CREATE POLICY "users_view_own" ON users
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      auth.uid()::text = id::text
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND auth.uid()::text = id::text
  );

-- Assets policies
CREATE POLICY "assets_access" ON assets
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR company_id IN (
        SELECT c.id FROM companies c
        JOIN licenses l ON l.id = c.license_id
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
      OR company_id IN (
        SELECT cp.company_id FROM company_permissions cp
        JOIN license_members lm ON lm.id = cp.license_member_id
        JOIN users u ON u.email = lm.email
        WHERE u.id = auth.uid()
      )
    )
  );

-- Inventory records policies  
CREATE POLICY "inventory_access" ON inventory_records
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR asset_id IN (
        SELECT a.id FROM assets a
        JOIN companies c ON c.id = a.company_id
        JOIN licenses l ON l.id = c.license_id
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
    )
  );

-- Activity logs policies
CREATE POLICY "activity_view_own" ON activity_logs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      auth.uid()::text = user_id::text
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "activity_insert" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Licenses policies
CREATE POLICY "licenses_view" ON licenses
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR owner_email IN (SELECT email FROM users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM license_members lm
        JOIN users u ON u.email = lm.email
        WHERE lm.license_id = licenses.id AND u.id = auth.uid()
      )
    )
  );

CREATE POLICY "licenses_manage" ON licenses
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR owner_email IN (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- License members policies
CREATE POLICY "members_view" ON license_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR license_id IN (
        SELECT l.id FROM licenses l
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
      OR email IN (SELECT email FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "members_manage" ON license_members
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR license_id IN (
        SELECT l.id FROM licenses l
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
    )
  );

-- Companies policies
CREATE POLICY "companies_view" ON companies
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR license_id IN (
        SELECT l.id FROM licenses l
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM company_permissions cp
        JOIN license_members lm ON lm.id = cp.license_member_id
        JOIN users u ON u.email = lm.email
        WHERE cp.company_id = companies.id AND u.id = auth.uid()
      )
    )
  );

CREATE POLICY "companies_manage" ON companies
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR license_id IN (
        SELECT l.id FROM licenses l
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
    )
  );

-- Company permissions policies
CREATE POLICY "permissions_view" ON company_permissions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR company_id IN (
        SELECT c.id FROM companies c
        JOIN licenses l ON l.id = c.license_id
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
      OR license_member_id IN (
        SELECT lm.id FROM license_members lm
        JOIN users u ON u.email = lm.email
        WHERE u.id = auth.uid()
      )
    )
  );

CREATE POLICY "permissions_manage" ON company_permissions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR company_id IN (
        SELECT c.id FROM companies c
        JOIN licenses l ON l.id = c.license_id
        JOIN users u ON u.email = l.owner_email
        WHERE u.id = auth.uid()
      )
    )
  );

-- User sessions policies
CREATE POLICY "sessions_view" ON user_sessions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR email IN (SELECT email FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "sessions_manage" ON user_sessions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR email IN (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- ================================================================
-- SECTION 7: GRANT PERMISSIONS
-- ================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select on tables to anon (for public access if needed)
GRANT SELECT ON users TO anon;
GRANT SELECT ON assets TO anon;

-- ================================================================
-- SECTION 8: INSERT SAMPLE DATA
-- ================================================================

-- Sample assets (will work after you create companies)
INSERT INTO assets (asset_code, name, model, serial, tech_code, department, status, location, notes) VALUES
('IT001', 'Dell Laptop Inspiron 15', 'Inspiron 15 3000', 'DL123456789', 'TECH001', 'IT Department', 'Đang sử dụng', 'Tầng 2 - Phòng IT', 'Laptop chính cho nhân viên IT'),
('IT002', 'HP Printer LaserJet', 'LaserJet Pro MFP M428fdw', 'HP987654321', 'TECH002', 'IT Department', 'Tốt', 'Tầng 1 - Khu vực in ấn', 'Máy in đa năng cho văn phòng'),
('HR001', 'Canon Camera EOS', 'EOS 80D', 'CN456789123', 'TECH003', 'HR Department', 'Tốt', 'Tầng 3 - Phòng HR', 'Máy ảnh cho sự kiện công ty'),
('FIN001', 'Samsung Monitor 27"', 'Odyssey G7', 'SM789123456', 'TECH004', 'Finance Department', 'Đang sử dụng', 'Tầng 2 - Phòng Tài chính', 'Màn hình cong cho kế toán'),
('ADM001', 'Cisco Router', 'ISR 4321', 'CS321654987', 'TECH005', 'IT Department', 'Đang sử dụng', 'Tầng B1 - Phòng server', 'Router chính của công ty')
ON CONFLICT (asset_code) DO NOTHING;

-- ================================================================
-- SECTION 9: FINAL MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ DATABASE SETUP COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables Created:';
  RAISE NOTICE '   ✓ users, assets, inventory_records, activity_logs';
  RAISE NOTICE '   ✓ licenses, license_members, companies';
  RAISE NOTICE '   ✓ company_permissions, user_sessions';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Functions Ready:';
  RAISE NOTICE '   ✓ Session management (validate, force, update)';
  RAISE NOTICE '   ✓ License info retrieval';
  RAISE NOTICE '   ✓ Auto-update triggers';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Enabled:';
  RAISE NOTICE '   ✓ Row Level Security on all tables';
  RAISE NOTICE '   ✓ Policies configured for auth users';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT - Next Steps:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Set your admin user:';
  RAISE NOTICE '   UPDATE users SET role = ''admin''';
  RAISE NOTICE '   WHERE email = ''your-email@gmail.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. Create first license in /admin portal';
  RAISE NOTICE '';
  RAISE NOTICE '3. Test the app at your domain';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🎉 Ready for Production!';
  RAISE NOTICE '====================================================';
END $$;

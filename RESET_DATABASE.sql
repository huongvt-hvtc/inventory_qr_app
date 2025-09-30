-- ================================================================
-- RESET DATABASE - DROP ALL TABLES AND RECREATE FOR CURRENT APP
-- Run this in Supabase SQL Editor to clean reset
-- ================================================================

-- STEP 1: DROP ALL EXISTING TABLES (in correct order to avoid FK constraints)
-- ================================================================
DROP TABLE IF EXISTS inventory_sessions CASCADE;
DROP TABLE IF EXISTS scan_history CASCADE;
DROP TABLE IF EXISTS device_sessions CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS user_companies CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining functions and policies
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- STEP 2: ENABLE EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- STEP 3: CREATE TABLES FOR CURRENT APP
-- ================================================================

-- 1. Users table (foundation)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  google_id TEXT UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Assets table (main business entity)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  serial TEXT,
  tech_code TEXT,
  status TEXT DEFAULT 'Đang sử dụng',
  location TEXT,
  notes TEXT,
  department TEXT,
  is_checked BOOLEAN DEFAULT false,
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: CREATE FUNCTIONS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to handle new user creation from auth
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: CREATE TRIGGERS
-- ================================================================

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_asset_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_is_checked ON assets(is_checked);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- STEP 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Users policies - Allow user creation and self-management
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Assets policies - All authenticated users can view/manage assets
CREATE POLICY "Authenticated users can view assets" ON assets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert assets" ON assets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update assets" ON assets
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete assets" ON assets
  FOR DELETE USING (auth.role() = 'authenticated');

-- STEP 8: INSERT SAMPLE DATA (Optional)
-- ================================================================

-- Uncomment if you want some sample data
/*
INSERT INTO assets (asset_code, name, model, serial, tech_code, status, location, department) VALUES
('LAPTOP001', 'MacBook Pro M2', 'MacBook Pro 14-inch', 'ABC123456789', 'TECH001', 'Đang sử dụng', 'Phòng IT', 'IT'),
('LAPTOP002', 'Dell XPS 13', 'XPS 13 9320', 'DEF987654321', 'TECH002', 'Đang sử dụng', 'Phòng Kế toán', 'Kế toán'),
('PRINTER001', 'Canon LBP2900', 'LBP2900', 'CAN789123456', 'TECH003', 'Đang bảo trì', 'Phòng Hành chính', 'Hành chính');
*/

-- ================================================================
-- RESET COMPLETE!
-- ================================================================
-- Your database is now clean and ready for the current app
-- All unnecessary tables from admin/license system have been removed
-- Only core tables needed for asset management remain
-- ================================================================
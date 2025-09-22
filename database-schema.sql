-- Asset Inventory QR Management System Database Schema
-- Run this script in your Supabase SQL editor

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  google_id TEXT UNIQUE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT UNIQUE NOT NULL, -- Mã tài sản
  name TEXT NOT NULL, -- Tên tài sản
  model TEXT, -- Model
  serial TEXT, -- Serial
  tech_code TEXT, -- Tech Code
  department TEXT, -- Bộ phận
  status TEXT, -- Tình trạng
  location TEXT, -- Vị trí
  notes TEXT, -- Ghi chú
  qr_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_records table for tracking scans
CREATE TABLE IF NOT EXISTS inventory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  checked_by TEXT NOT NULL, -- Người kiểm kê
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Thời gian kiểm kê
  location_found TEXT, -- Vị trí tìm thấy
  condition_found TEXT, -- Tình trạng tìm thấy
  notes TEXT, -- Ghi chú kiểm kê
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'asset', 'inventory', 'user'
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location);
CREATE INDEX IF NOT EXISTS idx_inventory_asset_id ON inventory_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checked_at ON inventory_records(checked_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for assets table (allow all authenticated users)
CREATE POLICY "Authenticated users can view assets" ON assets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert assets" ON assets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update assets" ON assets
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete assets" ON assets
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for inventory_records table
CREATE POLICY "Authenticated users can view inventory records" ON inventory_records
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert inventory records" ON inventory_records
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inventory records" ON inventory_records
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for activity_logs table
CREATE POLICY "Users can view own activity logs" ON activity_logs
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Authenticated users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get asset with inventory status
CREATE OR REPLACE FUNCTION get_assets_with_inventory_status()
RETURNS TABLE (
  id UUID,
  asset_code TEXT,
  name TEXT,
  model TEXT,
  serial TEXT,
  tech_code TEXT,
  department TEXT,
  status TEXT,
  location TEXT,
  notes TEXT,
  qr_generated BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_checked BOOLEAN,
  checked_by TEXT,
  checked_at TIMESTAMP WITH TIME ZONE,
  inventory_notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.asset_code,
    a.name,
    a.model,
    a.serial,
    a.tech_code,
    a.department,
    a.status,
    a.location,
    a.notes,
    a.qr_generated,
    a.created_at,
    a.updated_at,
    CASE WHEN ir.id IS NOT NULL THEN true ELSE false END as is_checked,
    ir.checked_by,
    ir.checked_at,
    ir.notes as inventory_notes
  FROM assets a
  LEFT JOIN (
    SELECT DISTINCT ON (asset_id)
      id, asset_id, checked_by, checked_at, notes
    FROM inventory_records
    ORDER BY asset_id, checked_at DESC
  ) ir ON a.id = ir.asset_id
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data
INSERT INTO assets (asset_code, name, model, serial, tech_code, department, status, location, notes) VALUES
('IT001', 'Dell Laptop Inspiron 15', 'Inspiron 15 3000', 'DL123456789', 'TECH001', 'IT Department', 'Đang sử dụng', 'Tầng 2 - Phòng IT', 'Laptop chính cho nhân viên IT'),
('IT002', 'HP Printer LaserJet', 'LaserJet Pro MFP M428fdw', 'HP987654321', 'TECH002', 'IT Department', 'Tốt', 'Tầng 1 - Khu vực in ấn', 'Máy in đa năng cho văn phòng'),
('HR001', 'Canon Camera EOS', 'EOS 80D', 'CN456789123', 'TECH003', 'HR Department', 'Tốt', 'Tầng 3 - Phòng HR', 'Máy ảnh cho sự kiện công ty'),
('FIN001', 'Samsung Monitor 27"', 'Odyssey G7', 'SM789123456', 'TECH004', 'Finance Department', 'Đang sử dụng', 'Tầng 2 - Phòng Tài chính', 'Màn hình cong cho kế toán'),
('ADM001', 'Cisco Router', 'ISR 4321', 'CS321654987', 'TECH005', 'IT Department', 'Đang sử dụng', 'Tầng B1 - Phòng server', 'Router chính của công ty')
ON CONFLICT (asset_code) DO NOTHING;

-- Add some sample inventory records
INSERT INTO inventory_records (asset_id, asset_code, checked_by, checked_at, notes)
SELECT
  a.id,
  a.asset_code,
  'Demo User',
  NOW() - INTERVAL '1 day',
  'Kiểm kê demo'
FROM assets a
WHERE a.asset_code IN ('IT001', 'HR001')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE users IS 'User authentication and profile information';
COMMENT ON TABLE assets IS 'Asset inventory master data';
COMMENT ON TABLE inventory_records IS 'Asset scanning and checking records';
COMMENT ON TABLE activity_logs IS 'System activity audit trail';

COMMENT ON COLUMN assets.asset_code IS 'Unique asset identification code (Mã tài sản)';
COMMENT ON COLUMN assets.name IS 'Asset name in Vietnamese (Tên tài sản)';
COMMENT ON COLUMN assets.model IS 'Asset model/version';
COMMENT ON COLUMN assets.serial IS 'Asset serial number';
COMMENT ON COLUMN assets.tech_code IS 'Technical specification code';
COMMENT ON COLUMN assets.department IS 'Department that owns the asset (Bộ phận)';
COMMENT ON COLUMN assets.status IS 'Current asset condition (Tình trạng)';
COMMENT ON COLUMN assets.location IS 'Physical location of asset (Vị trí)';
COMMENT ON COLUMN assets.notes IS 'Additional notes (Ghi chú)';
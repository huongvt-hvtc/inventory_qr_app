-- ================================================================
-- INVENTORY QR APP - COMPLETE DATABASE SCHEMA
-- Modern Asset Management with QR Code Integration
-- ================================================================
-- Version: 2.0.0 (Post-License System)
-- Run this complete script in Supabase SQL Editor
-- This creates all tables, functions, and policies from scratch
-- ================================================================

-- Enable required extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- 2. Assets table (main business entity)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inventory records (tracking asset checks)
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

-- 4. Activity logs (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- SECTION 2: CREATE INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_inventory_asset_id ON inventory_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checked_by ON inventory_records(checked_by);
CREATE INDEX IF NOT EXISTS idx_inventory_checked_at ON inventory_records(checked_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ================================================================
-- SECTION 3: CREATE UTILITY FUNCTIONS
-- ================================================================

-- Function to update timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique asset code
CREATE OR REPLACE FUNCTION generate_asset_code(department_prefix TEXT DEFAULT 'GEN')
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    counter INTEGER := 1;
    prefix TEXT := COALESCE(department_prefix, 'GEN');
BEGIN
    LOOP
        new_code := prefix || LPAD(counter::TEXT, 3, '0');

        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM assets WHERE asset_code = new_code) THEN
            RETURN new_code;
        END IF;

        counter := counter + 1;

        -- Prevent infinite loop
        IF counter > 999 THEN
            -- Use timestamp suffix for uniqueness
            new_code := prefix || EXTRACT(EPOCH FROM NOW())::INTEGER::TEXT;
            EXIT;
        END IF;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
    VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_details)
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get asset statistics
CREATE OR REPLACE FUNCTION get_asset_stats(p_user_email TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    total_assets INTEGER;
    recent_checks INTEGER;
    departments_count INTEGER;
    qr_generated_count INTEGER;
BEGIN
    -- Count total assets (filtered by user if provided)
    SELECT COUNT(*) INTO total_assets
    FROM assets
    WHERE p_user_email IS NULL OR created_by = p_user_email;

    -- Count recent inventory checks (last 30 days)
    SELECT COUNT(*) INTO recent_checks
    FROM inventory_records ir
    LEFT JOIN assets a ON a.id = ir.asset_id
    WHERE ir.checked_at > NOW() - INTERVAL '30 days'
      AND (p_user_email IS NULL OR a.created_by = p_user_email);

    -- Count unique departments
    SELECT COUNT(DISTINCT department) INTO departments_count
    FROM assets
    WHERE department IS NOT NULL
      AND (p_user_email IS NULL OR created_by = p_user_email);

    -- Count assets with QR generated
    SELECT COUNT(*) INTO qr_generated_count
    FROM assets
    WHERE qr_generated = true
      AND (p_user_email IS NULL OR created_by = p_user_email);

    RETURN json_build_object(
        'total_assets', total_assets,
        'recent_checks', recent_checks,
        'departments_count', departments_count,
        'qr_generated_count', qr_generated_count,
        'qr_coverage_percent',
        CASE
            WHEN total_assets > 0 THEN ROUND((qr_generated_count::DECIMAL / total_assets) * 100, 1)
            ELSE 0
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search assets
CREATE OR REPLACE FUNCTION search_assets(
    p_query TEXT,
    p_user_email TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    asset_code TEXT,
    name TEXT,
    model TEXT,
    department TEXT,
    status TEXT,
    location TEXT,
    last_checked TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.asset_code,
        a.name,
        a.model,
        a.department,
        a.status,
        a.location,
        MAX(ir.checked_at) as last_checked,
        ts_rank(
            to_tsvector('english',
                COALESCE(a.asset_code, '') || ' ' ||
                COALESCE(a.name, '') || ' ' ||
                COALESCE(a.model, '') || ' ' ||
                COALESCE(a.department, '') || ' ' ||
                COALESCE(a.location, '')
            ),
            plainto_tsquery('english', p_query)
        ) as rank
    FROM assets a
    LEFT JOIN inventory_records ir ON ir.asset_id = a.id
    WHERE (
        a.asset_code ILIKE '%' || p_query || '%' OR
        a.name ILIKE '%' || p_query || '%' OR
        a.model ILIKE '%' || p_query || '%' OR
        a.department ILIKE '%' || p_query || '%' OR
        a.location ILIKE '%' || p_query || '%' OR
        to_tsvector('english',
            COALESCE(a.asset_code, '') || ' ' ||
            COALESCE(a.name, '') || ' ' ||
            COALESCE(a.model, '')
        ) @@ plainto_tsquery('english', p_query)
    )
    AND (p_user_email IS NULL OR a.created_by = p_user_email)
    GROUP BY a.id, a.asset_code, a.name, a.model, a.department, a.status, a.location
    ORDER BY rank DESC, a.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- SECTION 4: CREATE TRIGGERS
-- ================================================================

-- Trigger to auto-update timestamps
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-log asset changes
CREATE OR REPLACE FUNCTION trigger_log_asset_changes()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
    change_details JSONB;
BEGIN
    -- Get user ID from email
    SELECT id INTO user_id FROM users WHERE email = COALESCE(NEW.created_by, OLD.created_by);

    -- Build change details
    IF TG_OP = 'INSERT' THEN
        change_details := json_build_object(
            'asset_code', NEW.asset_code,
            'name', NEW.name,
            'action', 'created'
        );

        PERFORM log_activity(user_id, 'create_asset', 'asset', NEW.id, change_details);

    ELSIF TG_OP = 'UPDATE' THEN
        change_details := json_build_object(
            'asset_code', NEW.asset_code,
            'changes', json_build_object(
                'name', CASE WHEN OLD.name != NEW.name THEN json_build_object('from', OLD.name, 'to', NEW.name) END,
                'location', CASE WHEN OLD.location != NEW.location THEN json_build_object('from', OLD.location, 'to', NEW.location) END,
                'status', CASE WHEN OLD.status != NEW.status THEN json_build_object('from', OLD.status, 'to', NEW.status) END
            ),
            'action', 'updated'
        );

        PERFORM log_activity(user_id, 'update_asset', 'asset', NEW.id, change_details);

    ELSIF TG_OP = 'DELETE' THEN
        change_details := json_build_object(
            'asset_code', OLD.asset_code,
            'name', OLD.name,
            'action', 'deleted'
        );

        PERFORM log_activity(user_id, 'delete_asset', 'asset', OLD.id, change_details);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_asset_changes
    AFTER INSERT OR UPDATE OR DELETE ON assets
    FOR EACH ROW EXECUTE FUNCTION trigger_log_asset_changes();

-- ================================================================
-- SECTION 5: ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- SECTION 6: CREATE RLS POLICIES
-- ================================================================

-- Users policies: users can view/update their own records, admins can see all
CREATE POLICY "users_view_policy" ON users
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            auth.uid()::text = id::text
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND auth.uid()::text = id::text
    );

-- Assets policies: users can manage their own assets, admins can see all
CREATE POLICY "assets_select_policy" ON assets
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            OR created_by IN (SELECT email FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "assets_insert_policy" ON assets
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by IN (SELECT email FROM users WHERE id = auth.uid())
    );

CREATE POLICY "assets_update_policy" ON assets
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            OR created_by IN (SELECT email FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "assets_delete_policy" ON assets
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            OR created_by IN (SELECT email FROM users WHERE id = auth.uid())
        )
    );

-- Inventory records policies: access based on asset ownership
CREATE POLICY "inventory_select_policy" ON inventory_records
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            OR asset_id IN (
                SELECT a.id FROM assets a
                JOIN users u ON u.email = a.created_by
                WHERE u.id = auth.uid()
            )
        )
    );

CREATE POLICY "inventory_insert_policy" ON inventory_records
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        checked_by IN (SELECT email FROM users WHERE id = auth.uid())
    );

-- Activity logs policies: users can view their own logs, admins can see all
CREATE POLICY "activity_logs_select_policy" ON activity_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            auth.uid()::text = user_id::text
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY "activity_logs_insert_policy" ON activity_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

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

-- Grant select on public tables to anon (for public access if needed)
GRANT SELECT ON users TO anon;

-- ================================================================
-- SECTION 8: SAMPLE DATA
-- ================================================================

-- Sample assets for testing (uncomment if needed)
/*
INSERT INTO assets (asset_code, name, model, serial, tech_code, department, status, location, notes, created_by) VALUES
('IT001', 'Dell Laptop Inspiron 15', 'Inspiron 15 3000', 'DL123456789', 'TECH001', 'IT Department', 'Đang sử dụng', 'Tầng 2 - Phòng IT', 'Laptop chính cho nhân viên IT', 'admin@example.com'),
('IT002', 'HP Printer LaserJet', 'LaserJet Pro MFP M428fdw', 'HP987654321', 'TECH002', 'IT Department', 'Tốt', 'Tầng 1 - Khu vực in ấn', 'Máy in đa năng cho văn phòng', 'admin@example.com'),
('HR001', 'Canon Camera EOS', 'EOS 80D', 'CN456789123', 'TECH003', 'HR Department', 'Tốt', 'Tầng 3 - Phòng HR', 'Máy ảnh cho sự kiện công ty', 'admin@example.com'),
('FIN001', 'Samsung Monitor 27"', 'Odyssey G7', 'SM789123456', 'TECH004', 'Finance Department', 'Đang sử dụng', 'Tầng 2 - Phòng Tài chính', 'Màn hình cong cho kế toán', 'admin@example.com'),
('ADM001', 'Cisco Router', 'ISR 4321', 'CS321654987', 'TECH005', 'IT Department', 'Đang sử dụng', 'Tầng B1 - Phòng server', 'Router chính của công ty', 'admin@example.com')
ON CONFLICT (asset_code) DO NOTHING;
*/

-- ================================================================
-- SECTION 9: HELPFUL VIEWS
-- ================================================================

-- View for asset summary with latest inventory check
CREATE OR REPLACE VIEW asset_summary AS
SELECT
    a.id,
    a.asset_code,
    a.name,
    a.model,
    a.department,
    a.status,
    a.location,
    a.qr_generated,
    a.created_by,
    a.created_at,
    a.updated_at,
    latest_check.checked_at as last_checked,
    latest_check.checked_by as last_checked_by,
    latest_check.location_found as last_location_found,
    latest_check.condition_found as last_condition_found
FROM assets a
LEFT JOIN LATERAL (
    SELECT checked_at, checked_by, location_found, condition_found
    FROM inventory_records ir
    WHERE ir.asset_id = a.id
    ORDER BY ir.checked_at DESC
    LIMIT 1
) latest_check ON true;

-- View for recent activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT
    al.id,
    al.action,
    al.resource_type,
    al.details,
    al.created_at,
    u.name as user_name,
    u.email as user_email
FROM activity_logs al
LEFT JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC;

-- ================================================================
-- SECTION 10: COMPLETION MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================================';
    RAISE NOTICE '✅ INVENTORY QR DATABASE SETUP COMPLETED!';
    RAISE NOTICE '====================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Core Tables Created:';
    RAISE NOTICE '   ✓ users - User management';
    RAISE NOTICE '   ✓ assets - Asset inventory';
    RAISE NOTICE '   ✓ inventory_records - Check history';
    RAISE NOTICE '   ✓ activity_logs - Audit trail';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Functions Available:';
    RAISE NOTICE '   ✓ generate_asset_code() - Auto asset codes';
    RAISE NOTICE '   ✓ log_activity() - Activity logging';
    RAISE NOTICE '   ✓ get_asset_stats() - Statistics';
    RAISE NOTICE '   ✓ search_assets() - Full-text search';
    RAISE NOTICE '';
    RAISE NOTICE '👁️ Views Created:';
    RAISE NOTICE '   ✓ asset_summary - Assets with latest checks';
    RAISE NOTICE '   ✓ recent_activity - Recent user actions';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Enabled:';
    RAISE NOTICE '   ✓ Row Level Security on all tables';
    RAISE NOTICE '   ✓ User-based access policies';
    RAISE NOTICE '   ✓ Admin override permissions';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ NEXT STEPS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Set your admin user role:';
    RAISE NOTICE '   UPDATE users SET role = ''admin''';
    RAISE NOTICE '   WHERE email = ''your-email@example.com'';';
    RAISE NOTICE '';
    RAISE NOTICE '2. Test the application:';
    RAISE NOTICE '   - Login with Google OAuth';
    RAISE NOTICE '   - Create assets';
    RAISE NOTICE '   - Generate QR codes';
    RAISE NOTICE '   - Test scanning';
    RAISE NOTICE '';
    RAISE NOTICE '3. Optional - Load sample data:';
    RAISE NOTICE '   Uncomment INSERT statements in SECTION 8';
    RAISE NOTICE '';
    RAISE NOTICE '====================================================';
    RAISE NOTICE '🎉 READY FOR PRODUCTION!';
    RAISE NOTICE '====================================================';
END $$;
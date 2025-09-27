-- ULTRA SIMPLE SETUP - Chắc chắn 100% thành công!
-- Copy và paste toàn bộ file này vào Supabase SQL Editor

-- Bước 1: Xóa hết để bắt đầu lại
DROP TABLE IF EXISTS public.license_activity_logs CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.company_members CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.license_keys CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Bước 2: Tạo lại từ đầu
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    google_id TEXT,
    role TEXT DEFAULT 'user',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng admin_users
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng license_keys (đầy đủ)
CREATE TABLE public.license_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_code TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    customer_email TEXT,
    plan_type TEXT DEFAULT 'pro',
    max_companies INTEGER DEFAULT 10,
    max_users INTEGER DEFAULT 200,
    max_assets INTEGER DEFAULT 20000,
    current_companies INTEGER DEFAULT 0,
    current_users INTEGER DEFAULT 0,
    current_assets INTEGER DEFAULT 0,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status TEXT DEFAULT 'active',
    price BIGINT,
    notes TEXT,
    features JSONB DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    total_api_calls BIGINT DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng companies
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES public.users(id),
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    license_key_id UUID REFERENCES public.license_keys(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng company_members
CREATE TABLE public.company_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id),
    user_id UUID REFERENCES public.users(id),
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng assets
CREATE TABLE public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(15,2),
    current_value DECIMAL(15,2),
    status TEXT DEFAULT 'active',
    qr_code TEXT,
    image_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- Bảng logs
CREATE TABLE public.license_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_key_id UUID REFERENCES public.license_keys(id),
    action TEXT NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bước 3: Bật RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_activity_logs ENABLE ROW LEVEL SECURITY;

-- Bước 4: Tạo policies cơ bản
CREATE POLICY "allow_read_users" ON public.users FOR SELECT USING (true);
CREATE POLICY "allow_insert_users" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_read_admin" ON public.admin_users FOR SELECT USING (true);

CREATE POLICY "admin_manage_licenses" ON public.license_keys FOR ALL USING (
    auth.jwt() ->> 'email' = 'mr.ngoctmn@gmail.com'
);

CREATE POLICY "manage_companies" ON public.companies FOR ALL USING (
    owner_id = auth.uid()
);

CREATE POLICY "manage_members" ON public.company_members FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
);

CREATE POLICY "manage_assets" ON public.assets FOR ALL USING (
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
);

CREATE POLICY "admin_view_logs" ON public.license_activity_logs FOR SELECT USING (
    auth.jwt() ->> 'email' = 'mr.ngoctmn@gmail.com'
);

-- Bước 5: Cấp quyền
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Bước 6: Thêm data
INSERT INTO public.admin_users (email, name, role)
VALUES ('mr.ngoctmn@gmail.com', 'Ngoc Admin', 'super_admin');

INSERT INTO public.license_keys (
    key_code, company_name, customer_email, plan_type,
    max_companies, max_users, max_assets,
    valid_from, valid_until, status, notes, features
) VALUES (
    'DEMO-2025-001', 'Demo Company', 'demo@example.com', 'pro',
    10, 200, 20000,
    CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', 'active',
    'Demo license for testing admin functionality',
    '{"plan_features": ["Priority support", "Excel export", "API access", "Advanced reporting"]}'
);

-- Hoàn thành!
DO $$
BEGIN
    RAISE NOTICE '🎉 THÀNH CÔNG! Database đã setup xong!';
    RAISE NOTICE '👤 Admin: mr.ngoctmn@gmail.com';
    RAISE NOTICE '🔑 Demo license: DEMO-2025-001';
    RAISE NOTICE '✅ Có thể login admin ngay bây giờ!';
END $$;
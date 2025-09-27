-- Comprehensive Admin System Database Setup
-- Run this script in Supabase SQL Editor

-- 0. Create core tables first if they don't exist

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    google_id TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    license_key_id UUID, -- Will add foreign key constraint later
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company members table
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_by UUID REFERENCES public.users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Assets table
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    location TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(15,2),
    current_value DECIMAL(15,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'disposed', 'lost')),
    qr_code TEXT,
    image_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- 1. Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create license_keys table
CREATE TABLE IF NOT EXISTS public.license_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_code TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    customer_email TEXT,

    -- Plan and limits
    plan_type TEXT CHECK (plan_type IN ('basic', 'pro', 'enterprise')) NOT NULL DEFAULT 'basic',
    max_companies INTEGER NOT NULL DEFAULT 3,
    max_users INTEGER NOT NULL DEFAULT 50,
    max_assets INTEGER NOT NULL DEFAULT 5000,

    -- Current usage (will be updated by triggers)
    current_companies INTEGER NOT NULL DEFAULT 0,
    current_users INTEGER NOT NULL DEFAULT 0,
    current_assets INTEGER NOT NULL DEFAULT 0,

    -- Validity
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status TEXT CHECK (status IN ('active', 'expired', 'suspended')) NOT NULL DEFAULT 'active',

    -- Pricing and notes
    price BIGINT, -- Price in VND
    notes TEXT,

    -- Features (JSON)
    features JSONB DEFAULT '{}',

    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    total_api_calls BIGINT DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create license_activity_logs table
CREATE TABLE IF NOT EXISTS public.license_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_key_id UUID REFERENCES public.license_keys(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add foreign key constraint to companies.license_key_id
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'companies_license_key_id_fkey'
        AND table_name = 'companies'
    ) THEN
        ALTER TABLE public.companies
        ADD CONSTRAINT companies_license_key_id_fkey
        FOREIGN KEY (license_key_id) REFERENCES public.license_keys(id);
    END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_license_keys_key_code ON public.license_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON public.license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_valid_until ON public.license_keys(valid_until);
CREATE INDEX IF NOT EXISTS idx_license_keys_customer_email ON public.license_keys(customer_email);
CREATE INDEX IF NOT EXISTS idx_license_activity_logs_license_id ON public.license_activity_logs(license_key_id);
CREATE INDEX IF NOT EXISTS idx_companies_license_key_id ON public.companies(license_key_id);

-- 6. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for admin_users
CREATE POLICY "Admin users can read all admin records" ON admin_users
  FOR SELECT USING (true);

-- 8. Create RLS policies for license_keys
-- Allow admins to see all license keys
DROP POLICY IF EXISTS "Admin can view all license keys" ON public.license_keys;
CREATE POLICY "Admin can view all license keys" ON public.license_keys
    FOR SELECT USING (
        auth.jwt() ->> 'email' IN ('mr.ngoctmn@gmail.com')
    );

-- Allow admins to insert license keys
DROP POLICY IF EXISTS "Admin can insert license keys" ON public.license_keys;
CREATE POLICY "Admin can insert license keys" ON public.license_keys
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'email' IN ('mr.ngoctmn@gmail.com')
    );

-- Allow admins to update license keys
DROP POLICY IF EXISTS "Admin can update license keys" ON public.license_keys;
CREATE POLICY "Admin can update license keys" ON public.license_keys
    FOR UPDATE USING (
        auth.jwt() ->> 'email' IN ('mr.ngoctmn@gmail.com')
    );

-- Allow users to view their own company's license
DROP POLICY IF EXISTS "Users can view their company license" ON public.license_keys;
CREATE POLICY "Users can view their company license" ON public.license_keys
    FOR SELECT USING (
        id IN (
            SELECT license_key_id
            FROM public.companies
            WHERE id IN (
                SELECT company_id
                FROM public.company_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- 9. Create RLS policies for core tables

-- Users policies
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies policies
DROP POLICY IF EXISTS "Users can view companies they are members of" ON public.companies;
CREATE POLICY "Users can view companies they are members of" ON public.companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Company owners can update their companies" ON public.companies;
CREATE POLICY "Company owners can update their companies" ON public.companies
    FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Company members policies
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;
CREATE POLICY "Users can view company members" ON public.company_members
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Company owners can manage members" ON public.company_members;
CREATE POLICY "Company owners can manage members" ON public.company_members
    FOR ALL USING (
        company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
        )
    );

-- Assets policies
DROP POLICY IF EXISTS "Users can view company assets" ON public.assets;
CREATE POLICY "Users can view company assets" ON public.assets
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage company assets" ON public.assets;
CREATE POLICY "Users can manage company assets" ON public.assets
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
    );

-- 10. Create RLS policies for license_activity_logs
-- Allow admins to see all activity logs
DROP POLICY IF EXISTS "Admin can view all activity logs" ON public.license_activity_logs;
CREATE POLICY "Admin can view all activity logs" ON public.license_activity_logs
    FOR SELECT USING (
        auth.jwt() ->> 'email' IN ('mr.ngoctmn@gmail.com')
    );

-- Allow admins to insert activity logs
DROP POLICY IF EXISTS "Admin can insert activity logs" ON public.license_activity_logs;
CREATE POLICY "Admin can insert activity logs" ON public.license_activity_logs
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'email' IN ('mr.ngoctmn@gmail.com')
    );

-- 11. Create function to update license usage stats
CREATE OR REPLACE FUNCTION update_license_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current usage counts for the license
    IF TG_TABLE_NAME = 'companies' THEN
        UPDATE public.license_keys
        SET
            current_companies = (
                SELECT COUNT(*)
                FROM public.companies
                WHERE license_key_id = COALESCE(NEW.license_key_id, OLD.license_key_id)
            ),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.license_key_id, OLD.license_key_id);
    END IF;

    IF TG_TABLE_NAME = 'users' THEN
        -- Update user count for all licenses that have companies with this user
        UPDATE public.license_keys
        SET
            current_users = (
                SELECT COUNT(DISTINCT cm.user_id)
                FROM public.company_members cm
                JOIN public.companies c ON c.id = cm.company_id
                WHERE c.license_key_id = license_keys.id
            ),
            updated_at = NOW()
        WHERE id IN (
            SELECT DISTINCT c.license_key_id
            FROM public.companies c
            JOIN public.company_members cm ON cm.company_id = c.id
            WHERE cm.user_id = COALESCE(NEW.id, OLD.id)
            AND c.license_key_id IS NOT NULL
        );
    END IF;

    IF TG_TABLE_NAME = 'assets' THEN
        -- Update asset count for licenses
        UPDATE public.license_keys
        SET
            current_assets = (
                SELECT COUNT(*)
                FROM public.assets a
                JOIN public.companies c ON c.id = a.company_id
                WHERE c.license_key_id = license_keys.id
            ),
            updated_at = NOW()
        WHERE id IN (
            SELECT DISTINCT c.license_key_id
            FROM public.companies c
            WHERE c.id = COALESCE(NEW.company_id, OLD.company_id)
            AND c.license_key_id IS NOT NULL
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 12. Create triggers to automatically update usage stats
DROP TRIGGER IF EXISTS update_license_stats_on_company_change ON public.companies;
CREATE TRIGGER update_license_stats_on_company_change
    AFTER INSERT OR UPDATE OR DELETE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_license_usage_stats();

DROP TRIGGER IF EXISTS update_license_stats_on_user_change ON public.users;
CREATE TRIGGER update_license_stats_on_user_change
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_license_usage_stats();

DROP TRIGGER IF EXISTS update_license_stats_on_asset_change ON public.assets;
CREATE TRIGGER update_license_stats_on_asset_change
    AFTER INSERT OR UPDATE OR DELETE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION update_license_usage_stats();

-- 13. Insert initial admin user
INSERT INTO admin_users (email, name, role)
VALUES ('mr.ngoctmn@gmail.com', 'Admin User', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = timezone('utc'::text, now());

-- 14. Create sample license for testing (optional)
INSERT INTO public.license_keys (
    key_code,
    company_name,
    customer_email,
    plan_type,
    max_companies,
    max_users,
    max_assets,
    valid_from,
    valid_until,
    status,
    price,
    notes,
    features
) VALUES (
    'INV-2025-DEMO-TEST001',
    'Demo Company',
    'demo@example.com',
    'pro',
    10,
    200,
    20000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '12 months',
    'active',
    12000000,
    'Demo license for testing admin functionality',
    '{"plan_features": ["Priority support", "Excel export", "API access", "Advanced reporting", "Custom fields", "Bulk operations"]}'
) ON CONFLICT (key_code) DO NOTHING;

-- 15. Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = user_email AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Core tables permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_members TO authenticated;
GRANT ALL ON public.assets TO authenticated;

-- Admin tables permissions
GRANT SELECT ON admin_users TO anon, authenticated;
GRANT ALL ON public.license_keys TO authenticated;
GRANT ALL ON public.license_activity_logs TO authenticated;

-- Sequences and functions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user(TEXT) TO anon, authenticated;

-- 17. Show completion message
DO $$
BEGIN
    RAISE NOTICE '🎉 Complete database setup completed successfully!';
    RAISE NOTICE '📊 Core tables: users, companies, company_members, assets';
    RAISE NOTICE '🔑 Admin tables: admin_users, license_keys, license_activity_logs';
    RAISE NOTICE '🔒 RLS policies configured for all tables';
    RAISE NOTICE '⚡ Triggers created for automatic usage tracking';
    RAISE NOTICE '🧪 Demo license added: INV-2025-DEMO-TEST001';
    RAISE NOTICE '👤 Admin user added: mr.ngoctmn@gmail.com';
    RAISE NOTICE '✅ Ready to use admin system at /admin';
END $$;
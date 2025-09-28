-- NEW EMAIL-BASED LICENSE SYSTEM SCHEMA
-- This creates the new licenses table structure that matches our React app

-- Drop old tables if they exist (be careful in production!)
DROP TABLE IF EXISTS public.license_activity_logs CASCADE;
DROP TABLE IF EXISTS public.company_permissions CASCADE;
DROP TABLE IF EXISTS public.license_members CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.licenses CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NEW licenses table (email-based, no KEY complexity)
CREATE TABLE public.licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_email TEXT NOT NULL, -- Primary license owner email

    -- Subscription Details
    plan_type TEXT NOT NULL DEFAULT 'basic', -- 'basic', 'pro', 'max', 'enterprise'
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'suspended'

    -- Plan Limits
    max_companies INTEGER NOT NULL DEFAULT 3,
    max_users INTEGER NOT NULL DEFAULT 999,
    max_assets INTEGER NOT NULL DEFAULT 99999,
    max_members INTEGER NOT NULL DEFAULT 1, -- Total members allowed in license

    -- Current Usage
    current_companies INTEGER DEFAULT 0,
    current_users INTEGER DEFAULT 0,
    current_assets INTEGER DEFAULT 0,
    current_members INTEGER DEFAULT 1, -- Owner counts as 1

    -- Billing
    price BIGINT DEFAULT 0,
    notes TEXT,

    -- Features
    features JSONB DEFAULT '{}',

    -- Tracking
    last_used_at TIMESTAMPTZ,
    total_api_calls BIGINT DEFAULT 0,

    -- Metadata
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- License members table (for shared access)
CREATE TABLE public.license_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'member'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,

    UNIQUE(license_id, email)
);

-- Companies table (simplified)
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL, -- User email who created the company
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company permissions table (granular permissions)
CREATE TABLE public.company_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    license_member_id UUID REFERENCES public.license_members(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer', -- 'admin', 'member', 'viewer'
    granted_by TEXT NOT NULL, -- License owner who granted this permission
    granted_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, license_member_id)
);

-- Update assets table to work with new structure
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_company_id_fkey;
ALTER TABLE public.assets ADD CONSTRAINT assets_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Enable RLS on all tables
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simple and non-recursive)

-- Licenses: Admin can see all, users can see their own licenses
DROP POLICY IF EXISTS "licenses_policy" ON public.licenses;
CREATE POLICY "licenses_policy" ON public.licenses FOR ALL USING (
    -- Admin access
    auth.jwt() ->> 'email' = 'mr.ngoctmn@gmail.com' OR
    -- License owner access
    owner_email = auth.jwt() ->> 'email' OR
    -- License member access
    id IN (
        SELECT license_id FROM public.license_members
        WHERE email = auth.jwt() ->> 'email' AND status = 'active'
    )
);

-- License members: Can see members of licenses they belong to
DROP POLICY IF EXISTS "license_members_policy" ON public.license_members;
CREATE POLICY "license_members_policy" ON public.license_members FOR ALL USING (
    -- Admin access
    auth.jwt() ->> 'email' = 'mr.ngoctmn@gmail.com' OR
    -- License owner access
    license_id IN (
        SELECT id FROM public.licenses WHERE owner_email = auth.jwt() ->> 'email'
    ) OR
    -- Member can see themselves
    email = auth.jwt() ->> 'email'
);

-- Companies: Can see companies in licenses they belong to
DROP POLICY IF EXISTS "companies_policy" ON public.companies;
CREATE POLICY "companies_policy" ON public.companies FOR ALL USING (
    -- Admin access
    auth.jwt() ->> 'email' = 'mr.ngoctmn@gmail.com' OR
    -- License owner access
    license_id IN (
        SELECT id FROM public.licenses WHERE owner_email = auth.jwt() ->> 'email'
    ) OR
    -- License member access
    license_id IN (
        SELECT license_id FROM public.license_members
        WHERE email = auth.jwt() ->> 'email' AND status = 'active'
    )
);

-- Company permissions: Can see permissions for companies they can access
DROP POLICY IF EXISTS "company_permissions_policy" ON public.company_permissions;
CREATE POLICY "company_permissions_policy" ON public.company_permissions FOR ALL USING (
    -- Admin access
    auth.jwt() ->> 'email' = 'mr.ngoctmn@gmail.com' OR
    -- Company in accessible license
    company_id IN (
        SELECT c.id FROM public.companies c
        JOIN public.licenses l ON l.id = c.license_id
        WHERE l.owner_email = auth.jwt() ->> 'email' OR
              l.id IN (
                  SELECT license_id FROM public.license_members
                  WHERE email = auth.jwt() ->> 'email' AND status = 'active'
              )
    )
);

-- Assets: Can see assets in companies they have access to
DROP POLICY IF EXISTS "assets_license_policy" ON public.assets;
CREATE POLICY "assets_license_policy" ON public.assets FOR ALL USING (
    -- Admin access
    auth.jwt() ->> 'email' = 'mr.ngoctmn@gmail.com' OR
    -- Company in accessible license
    company_id IN (
        SELECT c.id FROM public.companies c
        JOIN public.licenses l ON l.id = c.license_id
        WHERE l.owner_email = auth.jwt() ->> 'email' OR
              l.id IN (
                  SELECT license_id FROM public.license_members
                  WHERE email = auth.jwt() ->> 'email' AND status = 'active'
              )
    )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert admin user if not exists
INSERT INTO public.admin_users (email, name, role)
VALUES ('mr.ngoctmn@gmail.com', 'Ngoc Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample license for testing
INSERT INTO public.licenses (
    owner_email, plan_type, valid_from, valid_until,
    max_companies, max_users, max_assets, max_members,
    price, notes, features
) VALUES (
    'test@example.com', 'pro', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months',
    5, 999, 99999, 5,
    12000000, 'Sample license for testing',
    '{"plan_features": ["5 members", "5 công ty", "Phân quyền chi tiết", "Excel export", "API access", "Priority support"]}'
) ON CONFLICT DO NOTHING;

-- Create the license owner as a member
INSERT INTO public.license_members (license_id, email, role, status, joined_at)
SELECT id, owner_email, 'owner', 'active', NOW()
FROM public.licenses
WHERE owner_email = 'test@example.com'
ON CONFLICT (license_id, email) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 NEW EMAIL-BASED LICENSE SYSTEM CREATED!';
    RAISE NOTICE '👤 Admin: mr.ngoctmn@gmail.com';
    RAISE NOTICE '🧪 Test license: test@example.com';
    RAISE NOTICE '✅ Ready for React app!';
END $$;
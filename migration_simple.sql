-- Email-Based License Architecture Migration
-- Run this entire script in your Supabase SQL Editor

-- 1. Create licenses table for email-based system
CREATE TABLE public.licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_email TEXT NOT NULL,

    -- Subscription Details
    plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'max', 'enterprise')),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),

    -- Plan Limits
    max_companies INTEGER NOT NULL,
    max_users INTEGER NOT NULL,
    max_assets INTEGER NOT NULL,
    max_members INTEGER NOT NULL,

    -- Current Usage
    current_companies INTEGER NOT NULL DEFAULT 0,
    current_users INTEGER NOT NULL DEFAULT 0,
    current_assets INTEGER NOT NULL DEFAULT 0,
    current_members INTEGER NOT NULL DEFAULT 1,

    -- Billing
    price INTEGER,
    notes TEXT,

    -- Features (JSON)
    features JSONB DEFAULT '{}',

    -- Tracking
    last_used_at TIMESTAMPTZ,
    total_api_calls INTEGER DEFAULT 0,

    -- Metadata
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes on licenses table
CREATE INDEX idx_licenses_owner_email ON public.licenses(owner_email);
CREATE INDEX idx_licenses_status ON public.licenses(status);
CREATE INDEX idx_licenses_plan_type ON public.licenses(plan_type);

-- 2. Create license_members table
CREATE TABLE public.license_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    invited_by UUID,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ
);

-- Create indexes on license_members
CREATE INDEX idx_license_members_license_id ON public.license_members(license_id);
CREATE INDEX idx_license_members_email ON public.license_members(email);

-- 3. Update companies table (only if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
        -- Add license_id column if companies table exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'license_id') THEN
            ALTER TABLE public.companies ADD COLUMN license_id UUID REFERENCES public.licenses(id) ON DELETE CASCADE;
        END IF;

        -- Add created_by column if companies table exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'created_by') THEN
            ALTER TABLE public.companies ADD COLUMN created_by UUID;
        END IF;

        -- Create index
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'companies' AND indexname = 'idx_companies_license_id') THEN
            CREATE INDEX idx_companies_license_id ON public.companies(license_id);
        END IF;
    ELSE
        -- Create companies table if it doesn't exist
        CREATE TABLE public.companies (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX idx_companies_license_id ON public.companies(license_id);
    END IF;
END $$;

-- 4. Create company_permissions table for granular access control
CREATE TABLE public.company_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    license_member_id UUID NOT NULL REFERENCES public.license_members(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    granted_by UUID,
    granted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique permission per member per company
    UNIQUE(company_id, license_member_id)
);

-- Create indexes on company_permissions
CREATE INDEX idx_company_permissions_company_id ON public.company_permissions(company_id);
CREATE INDEX idx_company_permissions_member_id ON public.company_permissions(license_member_id);

-- 5. Enable Row Level Security
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for licenses table
CREATE POLICY "Users can view their own licenses" ON public.licenses
    FOR SELECT USING (
        owner_email = auth.jwt() ->> 'email' OR
        EXISTS (
            SELECT 1 FROM public.license_members
            WHERE license_id = licenses.id
            AND email = auth.jwt() ->> 'email'
            AND status = 'active'
        )
    );

-- Create RLS policies for license_members table
CREATE POLICY "Users can view license members they belong to" ON public.license_members
    FOR SELECT USING (
        email = auth.jwt() ->> 'email' OR
        EXISTS (
            SELECT 1 FROM public.licenses
            WHERE id = license_members.license_id
            AND owner_email = auth.jwt() ->> 'email'
        )
    );

-- Create RLS policies for company_permissions table
CREATE POLICY "Users can view permissions they have" ON public.company_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.license_members lm
            JOIN public.licenses l ON l.id = lm.license_id
            WHERE lm.id = company_permissions.license_member_id
            AND (l.owner_email = auth.jwt() ->> 'email' OR lm.email = auth.jwt() ->> 'email')
        )
    );

-- 6. Create useful database functions
CREATE OR REPLACE FUNCTION get_user_license_info(user_email TEXT)
RETURNS TABLE (
    license_id UUID,
    owner_email TEXT,
    plan_type TEXT,
    valid_until DATE,
    status TEXT,
    max_members INTEGER,
    current_members INTEGER,
    companies_count BIGINT,
    members_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.owner_email,
        l.plan_type,
        l.valid_until,
        l.status,
        l.max_members,
        l.current_members,
        (SELECT COUNT(*) FROM companies c WHERE c.license_id = l.id) as companies_count,
        (SELECT COUNT(*) FROM license_members lm WHERE lm.license_id = l.id AND lm.status = 'active') as members_count
    FROM licenses l
    LEFT JOIN license_members lm ON lm.license_id = l.id
    WHERE l.owner_email = user_email
       OR (lm.email = user_email AND lm.status = 'active')
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete!
-- The new email-based license system is ready to use.
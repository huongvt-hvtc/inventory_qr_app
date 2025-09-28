'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  License,
  Company,
  LicenseMember,
  LicenseUsageInfo
} from '@/types/license';
import toast from 'react-hot-toast';

export function useEmailLicense() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseUsageInfo | null>(null);
  const [userLicenseRole, setUserLicenseRole] = useState<'owner' | 'member' | null>(null);

  // Load user's license information (as owner or member)
  const loadLicenseInfo = async () => {
    if (!user?.email) {
      setLicenseInfo(null);
      setUserLicenseRole(null);
      return;
    }

    setLoading(true);
    try {
      // First, check if user is a license owner
      const { data: ownedLicense, error: ownerError } = await supabase
        .from('licenses')
        .select('*')
        .eq('owner_email', user.email)
        .eq('status', 'active')
        .single();

      let license: License | null = null;
      let role: 'owner' | 'member' = 'member';

      if (ownedLicense && !ownerError) {
        license = ownedLicense;
        role = 'owner';
      } else {
        // If not owner, check if user is a member
        const { data: memberData, error: memberError } = await supabase
          .from('license_members')
          .select(`
            license_id,
            role,
            licenses(*)
          `)
          .eq('email', user.email)
          .eq('status', 'active')
          .single();

        if (memberData && !memberError && memberData.licenses) {
          license = memberData.licenses as unknown as License;
          role = memberData.role as 'owner' | 'member';
        }
      }

      if (!license) {
        setLicenseInfo(null);
        setUserLicenseRole(null);
        return;
      }

      // Load companies for this license
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('license_id', license.id)
        .order('created_at', { ascending: true });

      if (companiesError) throw companiesError;

      // Load members for this license
      const { data: members, error: membersError } = await supabase
        .from('license_members')
        .select('*')
        .eq('license_id', license.id)
        .order('invited_at', { ascending: true });

      if (membersError) throw membersError;

      // Calculate current usage
      const currentUsage = {
        companies: {
          current: companies?.length || 0,
          max: license.max_companies
        },
        users: {
          current: license.current_users || 0,
          max: license.max_users
        },
        assets: {
          current: license.current_assets || 0,
          max: license.max_assets
        },
        members: {
          current: members?.length || 0,
          max: license.max_members
        }
      };

      setLicenseInfo({
        license: {
          id: license.id,
          owner_email: license.owner_email,
          plan_type: license.plan_type,
          valid_until: license.valid_until,
          status: license.status,
          max_members: license.max_members,
          max_companies: license.max_companies,
          max_users: license.max_users,
          max_assets: license.max_assets,
          features: license.features || {}
        },
        usage: currentUsage,
        companies: companies || [],
        members: members || []
      });

      setUserLicenseRole(role);

    } catch (error) {
      console.error('Error loading license info:', error);
      setLicenseInfo(null);
      setUserLicenseRole(null);
    } finally {
      setLoading(false);
    }
  };

  // Check if license is expired
  const isLicenseExpired = (): boolean => {
    if (!licenseInfo?.license) return true;
    const expiryDate = new Date(licenseInfo.license.valid_until);
    return expiryDate < new Date();
  };

  // Check if license is near expiry (within 30 days)
  const isLicenseNearExpiry = (): boolean => {
    if (!licenseInfo?.license) return false;
    const expiryDate = new Date(licenseInfo.license.valid_until);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  };

  // Check if user can perform action (based on license limits)
  const checkLicenseLimit = (action: 'add_company' | 'add_user' | 'add_asset' | 'add_member'): boolean => {
    if (!licenseInfo) return false;

    const { usage } = licenseInfo;

    switch (action) {
      case 'add_company':
        return usage.companies.current < usage.companies.max;
      case 'add_user':
        return usage.users.current < usage.users.max;
      case 'add_asset':
        return usage.assets.current < usage.assets.max;
      case 'add_member':
        return usage.members.current < usage.members.max;
      default:
        return false;
    }
  };

  // Get remaining limits
  const getRemainingLimits = () => {
    if (!licenseInfo) return null;

    const { usage } = licenseInfo;

    return {
      companies: usage.companies.max - usage.companies.current,
      users: usage.users.max - usage.users.current,
      assets: usage.assets.max - usage.assets.current,
      members: usage.members.max - usage.members.current
    };
  };

  // Load data when user changes
  useEffect(() => {
    loadLicenseInfo();
  }, [user?.email]);

  return {
    // State
    loading,
    licenseInfo,
    userLicenseRole,

    // Actions
    loadLicenseInfo,

    // Utilities
    checkLicenseLimit,
    getRemainingLimits,
    isLicenseExpired,
    isLicenseNearExpiry,

    // Computed
    hasActiveLicense: licenseInfo && licenseInfo.license.status === 'active' && !isLicenseExpired(),
    isTrialUser: !licenseInfo,
    isLicenseOwner: userLicenseRole === 'owner',
    isLicenseMember: userLicenseRole === 'member',
    hasLicenseAccess: userLicenseRole !== null
  };
}
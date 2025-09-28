import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseUsageInfo,
  Company,
  LicenseMember
} from '@/types/license';
import toast from 'react-hot-toast';

export function useLicense() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<LicenseUsageInfo | null>(null);
  const [userLicenseRole, setUserLicenseRole] = useState<'owner' | 'member' | null>(null);

  // Check if user has access to license (as owner or member)
  const checkUserLicenseAccess = async (licenseKeyId?: string) => {
    if (!user || !licenseKeyId) {
      setUserLicenseRole(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('license_members')
        .select('role, status')
        .eq('license_key_id', licenseKeyId)
        .eq('email', user.email)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setUserLicenseRole(data?.role || null);
    } catch (error) {
      console.error('Error checking license access:', error);
      setUserLicenseRole(null);
    }
  };

  // Load user's companies (owned or member of)
  const loadCompanies = async () => {
    if (!user) return;

    try {
      // First load companies owned by user
      const { data: ownedCompanies, error: ownedError } = await supabase
        .from('companies')
        .select(`
          *,
          license_key:license_keys(
            key_code,
            plan_type,
            status,
            valid_until
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Then load companies where user is a license member
      const { data: memberLicenses, error: memberError } = await supabase
        .from('license_members')
        .select(`
          license_key_id,
          role,
          license_key:license_keys(
            id,
            key_code,
            plan_type,
            status,
            valid_until,
            company_name
          )
        `)
        .eq('email', user.email)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Combine owned companies and member companies
      const allCompanies = [...(ownedCompanies || [])];

      // Add companies from member licenses that aren't already owned
      for (const memberLicense of memberLicenses || []) {
        const existingCompany = allCompanies.find(c => c.license_key_id === memberLicense.license_key_id);
        if (!existingCompany && memberLicense.license_key) {
          // Create a pseudo-company for member access
          allCompanies.push({
            id: `member-${memberLicense.license_key_id}`,
            name: memberLicense.license_key.company_name || 'Công ty thành viên',
            owner_id: '',
            license_key_id: memberLicense.license_key_id,
            created_at: '',
            updated_at: '',
            license_key: memberLicense.license_key
          });
        }
      }

      setCompanies(allCompanies);

      // Set first company as current if none selected
      if (allCompanies.length > 0 && !currentCompany) {
        setCurrentCompany(allCompanies[0]);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Không thể tải danh sách công ty');
    }
  };

  // Load license info for current company
  const loadLicenseInfo = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_license_info', { p_company_id: companyId });

      if (error) throw error;

      setLicenseInfo(data);
    } catch (error) {
      console.error('Error loading license info:', error);
      setLicenseInfo(null);
    }
  };

  // Activate license key
  const activateLicense = async (request: LicenseActivationRequest): Promise<LicenseActivationResponse> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('activate_license_key', {
          p_key_code: request.key_code,
          p_company_name: request.company_name,
          p_user_id: user.id
        });

      if (error) throw error;

      if (data.success) {
        toast.success('🎉 License kích hoạt thành công!');
        await loadCompanies(); // Reload companies
        return data;
      } else {
        toast.error(data.error || 'Không thể kích hoạt license');
        return data;
      }
    } catch (error: any) {
      console.error('Error activating license:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi kích hoạt license';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Check if user can perform action (based on license limits)
  const checkLicenseLimit = (action: 'add_company' | 'add_user' | 'add_asset'): boolean => {
    if (!licenseInfo) return false;

    const { usage } = licenseInfo;

    switch (action) {
      case 'add_company':
        return usage.companies.current < usage.companies.max;
      case 'add_user':
        return usage.users.current < usage.users.max;
      case 'add_asset':
        return usage.assets.current < usage.assets.max;
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
      assets: usage.assets.max - usage.assets.current
    };
  };

  // Check if license is expired
  const isLicenseExpired = (): boolean => {
    if (!licenseInfo) return true;

    const expiryDate = new Date(licenseInfo.license.valid_until);
    return expiryDate < new Date();
  };

  // Check if license is near expiry (within 30 days)
  const isLicenseNearExpiry = (): boolean => {
    if (!licenseInfo) return false;

    const expiryDate = new Date(licenseInfo.license.valid_until);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return expiryDate <= thirtyDaysFromNow;
  };

  // Switch current company
  const switchCompany = async (company: Company) => {
    setCurrentCompany(company);
    if (company.license_key_id) {
      await loadLicenseInfo(company.id);
    }
  };

  // Load data on mount and when current company changes
  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  useEffect(() => {
    if (currentCompany && currentCompany.license_key_id) {
      loadLicenseInfo(currentCompany.id);
      checkUserLicenseAccess(currentCompany.license_key_id);
    }
  }, [currentCompany]);

  return {
    // State
    loading,
    companies,
    currentCompany,
    licenseInfo,
    userLicenseRole,

    // Actions
    activateLicense,
    loadCompanies,
    switchCompany,
    checkUserLicenseAccess,

    // Utilities
    checkLicenseLimit,
    getRemainingLimits,
    isLicenseExpired,
    isLicenseNearExpiry,

    // Computed
    hasActiveLicense: licenseInfo && licenseInfo.license.status === 'active' && !isLicenseExpired(),
    isTrialUser: !licenseInfo || !currentCompany?.license_key_id,
    isLicenseOwner: userLicenseRole === 'owner',
    isLicenseMember: userLicenseRole === 'member',
    hasLicenseAccess: userLicenseRole !== null
  };
}
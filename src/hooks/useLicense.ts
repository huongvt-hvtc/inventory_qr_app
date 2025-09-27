import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseUsageInfo,
  Company
} from '@/types/license';
import toast from 'react-hot-toast';

export function useLicense() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<LicenseUsageInfo | null>(null);

  // Load user's companies
  const loadCompanies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      setCompanies(data || []);

      // Set first company as current if none selected
      if (data && data.length > 0 && !currentCompany) {
        setCurrentCompany(data[0]);
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
    }
  }, [currentCompany]);

  return {
    // State
    loading,
    companies,
    currentCompany,
    licenseInfo,

    // Actions
    activateLicense,
    loadCompanies,
    switchCompany,

    // Utilities
    checkLicenseLimit,
    getRemainingLimits,
    isLicenseExpired,
    isLicenseNearExpiry,

    // Computed
    hasActiveLicense: licenseInfo && licenseInfo.license.status === 'active' && !isLicenseExpired(),
    isTrialUser: !licenseInfo || !currentCompany?.license_key_id
  };
}
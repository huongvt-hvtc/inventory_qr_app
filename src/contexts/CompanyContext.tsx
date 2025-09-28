'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLicense } from '@/hooks/useLicense';
import { supabase } from '@/lib/supabase';
import type { Company, CompanyPermission } from '@/types/license';

interface CompanyContextType {
  // Current company
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;

  // Available companies for user
  availableCompanies: Company[];
  loadAvailableCompanies: () => Promise<void>;

  // User's role in current company
  userRole: 'owner' | 'admin' | 'member' | 'viewer' | null;

  // Loading states
  loading: boolean;

  // Permissions
  canManageCompany: boolean;
  canManageAssets: boolean;
  canViewAssets: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const { user } = useAuth();
  const { licenseInfo } = useLicense();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer' | null>(null);
  const [loading, setLoading] = useState(false);

  // Load companies that user has access to
  const loadAvailableCompanies = async () => {
    if (!user || !licenseInfo?.license?.id) {
      setAvailableCompanies([]);
      return;
    }

    setLoading(true);
    try {
      // Check if user is license owner
      if (licenseInfo.license.owner_email === user.email) {
        // License owner has access to all companies in the license
        const { data: allCompanies, error } = await supabase
          .from('companies')
          .select('*')
          .eq('license_id', licenseInfo.license.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setAvailableCompanies(allCompanies || []);

        // Set first company as current if none selected
        if (allCompanies && allCompanies.length > 0 && !currentCompany) {
          setCurrentCompany(allCompanies[0]);
        }
      } else {
        // For members, get companies they have permission to access
        const { data: memberData, error: memberError } = await supabase
          .from('license_members')
          .select('id')
          .eq('license_id', licenseInfo.license.id)
          .eq('email', user.email)
          .eq('status', 'active')
          .single();

        if (memberError) {
          console.error('Member not found:', memberError);
          setAvailableCompanies([]);
          return;
        }

        const { data: permissions, error: permError } = await supabase
          .from('company_permissions')
          .select(`
            company_id,
            role,
            company:companies(*)
          `)
          .eq('license_member_id', memberData.id);

        if (permError) throw permError;

        const accessibleCompanies = permissions?.map(p => p.company).filter(Boolean) as Company[] || [];
        setAvailableCompanies(accessibleCompanies);

        // Set first accessible company as current if none selected
        if (accessibleCompanies.length > 0 && !currentCompany) {
          setCurrentCompany(accessibleCompanies[0]);
        }
      }
    } catch (error) {
      console.error('Error loading user companies:', error);
      setAvailableCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // Load user's role in current company
  const loadUserRole = async () => {
    if (!user || !currentCompany || !licenseInfo?.license?.id) {
      setUserRole(null);
      return;
    }

    try {
      // Check if user is license owner
      if (licenseInfo.license.owner_email === user.email) {
        setUserRole('owner');
        return;
      }

      // Get member data
      const { data: memberData, error: memberError } = await supabase
        .from('license_members')
        .select('id')
        .eq('license_id', licenseInfo.license.id)
        .eq('email', user.email)
        .eq('status', 'active')
        .single();

      if (memberError) {
        setUserRole(null);
        return;
      }

      // Get user's role in current company
      const { data: permission, error: permError } = await supabase
        .from('company_permissions')
        .select('role')
        .eq('license_member_id', memberData.id)
        .eq('company_id', currentCompany.id)
        .single();

      if (permError) {
        setUserRole(null);
        return;
      }

      setUserRole(permission.role as 'admin' | 'member' | 'viewer');
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole(null);
    }
  };

  // Load data when dependencies change
  useEffect(() => {
    loadAvailableCompanies();
  }, [user, licenseInfo?.license?.id]);

  useEffect(() => {
    loadUserRole();
  }, [user, currentCompany, licenseInfo?.license?.id]);

  // Calculate permissions based on role
  const canManageCompany = userRole === 'owner' || userRole === 'admin';
  const canManageAssets = userRole === 'owner' || userRole === 'admin' || userRole === 'member';
  const canViewAssets = userRole !== null; // All roles can view

  const value: CompanyContextType = {
    currentCompany,
    setCurrentCompany,
    availableCompanies,
    loadAvailableCompanies,
    userRole,
    loading,
    canManageCompany,
    canManageAssets,
    canViewAssets,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
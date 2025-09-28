'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailLicense } from '@/hooks/useEmailLicense';
import toast from 'react-hot-toast';
import type { Company } from '@/types/license';

interface CompanySwitcherProps {
  onCompanyChange?: (company: Company) => void;
  showCreateButton?: boolean;
}

export default function CompanySwitcher({ onCompanyChange, showCreateButton = true }: CompanySwitcherProps) {
  const { user } = useAuth();
  const { licenseInfo } = useEmailLicense();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load companies that user has access to
  const loadUserCompanies = async () => {
    if (!user || !licenseInfo?.license?.id) return;

    setLoading(true);
    try {
      // For license owner, get all companies in the license
      if (licenseInfo.license.owner_email === user.email) {
        const { data: allCompanies, error } = await supabase
          .from('companies')
          .select('*')
          .eq('license_id', licenseInfo.license.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setCompanies(allCompanies || []);

        // Set first company as selected if none selected
        if (allCompanies && allCompanies.length > 0 && !selectedCompany) {
          setSelectedCompany(allCompanies[0]);
          onCompanyChange?.(allCompanies[0]);
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

        if (memberError) throw memberError;

        const { data: permissions, error: permError } = await supabase
          .from('company_permissions')
          .select(`
            company_id,
            role,
            company:companies(*)
          `)
          .eq('license_member_id', memberData.id);

        if (permError) throw permError;

        const accessibleCompanies = permissions?.map(p => p.company).filter(Boolean) as unknown as Company[] || [];
        setCompanies(accessibleCompanies);

        // Set first accessible company as selected
        if (accessibleCompanies.length > 0 && !selectedCompany) {
          setSelectedCompany(accessibleCompanies[0]);
          onCompanyChange?.(accessibleCompanies[0]);
        }
      }
    } catch (error) {
      console.error('Error loading user companies:', error);
      toast.error('Không thể tải danh sách công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserCompanies();
  }, [user, licenseInfo?.license?.id]);

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setIsOpen(false);
    onCompanyChange?.(company);
    toast.success(`Đã chuyển sang công ty: ${company.name}`);
  };

  const handleCreateCompany = () => {
    // This would typically open a modal or navigate to company creation
    // For now, let's navigate to settings where CompanyManagement is located
    if (typeof window !== 'undefined') {
      window.location.href = '/settings';
    }
  };

  // Don't render if user doesn't have license access
  if (!licenseInfo?.license) {
    return null;
  }

  // Don't render if no companies available
  if (companies.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-700">Chưa có công ty nào</span>
        {showCreateButton && licenseInfo.license.owner_email === user?.email && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCreateCompany}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 h-6 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Tạo
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Company Selector Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-auto justify-between bg-white border border-gray-200 hover:bg-gray-50 text-left"
        disabled={loading}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">
            {selectedCompany?.name || 'Chọn công ty'}
          </span>
          {companies.length === 1 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              Duy nhất
            </span>
          )}
        </div>
        {companies.length > 1 && (
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && companies.length > 1 && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <Card className="absolute top-full left-0 right-0 md:left-0 md:right-auto md:w-80 mt-2 z-50 shadow-lg border">
            <CardContent className="p-0">
              <div className="py-2">
                {/* Header */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Chọn công ty ({companies.length})
                    </span>
                    {showCreateButton && licenseInfo.license.owner_email === user?.email && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCreateCompany}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-6 px-2"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Tạo mới
                      </Button>
                    )}
                  </div>
                </div>

                {/* Company List */}
                <div className="max-h-64 overflow-y-auto">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {company.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Tạo: {new Date(company.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </div>

                      {selectedCompany?.id === company.id && (
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      handleCreateCompany();
                    }}
                    className="w-full text-gray-600 hover:text-gray-700 justify-start"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Quản lý công ty
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
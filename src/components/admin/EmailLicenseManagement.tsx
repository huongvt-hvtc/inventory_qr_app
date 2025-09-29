'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Trash2,
  Building2,
  Users,
  Calendar,
  Crown,
  Shield,
  AlertCircle,
  Check,
  Clock,
  Search,
  Package,
  ChevronDown,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { License, Company, LicenseMember } from '@/types/license';

interface LicenseWithDetails extends License {
  companies?: Company[];
  members?: LicenseMember[];
}

export default function EmailLicenseManagement() {
  const [licenses, setLicenses] = useState<LicenseWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);

  // Load all licenses with details
  const loadLicenses = async () => {
    setLoading(true);
    try {
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .select(`
          *,
          companies (*),
          license_members (*)
        `)
        .order('created_at', { ascending: false });

      if (licenseError) throw licenseError;

      const formattedLicenses: LicenseWithDetails[] = (licenseData || []).map((license: any) => {
        const {
          companies = [],
          license_members = [],
          ...rest
        } = license;

        const baseLicense = rest as License;

        return {
          ...baseLicense,
          companies: companies as Company[],
          members: license_members as LicenseMember[],
          current_assets: baseLicense.current_assets ?? 0
        };
      });

      setLicenses(formattedLicenses);
    } catch (error) {
      console.error('Error loading licenses:', error);
      toast.error('Không thể tải danh sách license');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  // Delete license
  const deleteLicense = async (license: LicenseWithDetails) => {
    if (confirm(`Bạn có chắc muốn xóa license của ${license.owner_email}? Tất cả dữ liệu liên quan sẽ bị mất.`)) {
      try {
        // Delete in order: assets -> company_permissions -> companies -> license_members -> license
        
        // Delete assets for all companies
        for (const company of license.companies || []) {
          const { error: assetError } = await supabase
            .from('assets')
            .delete()
            .eq('company_id', company.id);
          if (assetError) throw assetError;

          // Delete company permissions
          const { error: permError } = await supabase
            .from('company_permissions')
            .delete()
            .eq('company_id', company.id);
          if (permError) throw permError;
        }

        // Delete companies
        const { error: companyError } = await supabase
          .from('companies')
          .delete()
          .eq('license_id', license.id);
        if (companyError) throw companyError;

        // Delete members
        const { error: memberError } = await supabase
          .from('license_members')
          .delete()
          .eq('license_id', license.id);
        if (memberError) throw memberError;

        // Delete license
        const { error: licenseError } = await supabase
          .from('licenses')
          .delete()
          .eq('id', license.id);
        if (licenseError) throw licenseError;

        toast.success(`Đã xóa license của ${license.owner_email}`);
        await loadLicenses();
      } catch (error: any) {
        console.error('Error deleting license:', error);
        toast.error(error.message || 'Không thể xóa license');
      }
    }
  };

  // Filter licenses based on search
  const filteredLicenses = licenses.filter(license =>
    license.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.plan_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'expired': return 'bg-red-100 text-red-700 border-red-200';
      case 'suspended': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'enterprise': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'max': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pro': return 'bg-green-100 text-green-700 border-green-200';
      case 'basic': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  const getDaysRemaining = (validUntil: string) => {
    const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="space-y-4">
      {/* Header - Responsive */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
            Quản lý License
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Đang hiển thị {filteredLicenses.length} / {licenses.length} license theo email
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="h-4 w-4 text-blue-500" />
          Cập nhật {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
          <div className="text-xs text-green-600 font-medium">Hoạt động</div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-green-700">{filteredLicenses.filter(l => l.status === 'active').length}</p>
            <Check className="h-5 w-5 text-green-600" />
          </div>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <div className="text-xs text-red-600 font-medium">Đã hết hạn</div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-red-700">{filteredLicenses.filter(l => l.status === 'expired').length}</p>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="text-xs text-blue-600 font-medium">Tổng doanh thu</div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-lg font-semibold text-blue-700">{formatCurrency(filteredLicenses.reduce((sum, l) => sum + (l.price || 0), 0))}</p>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
          <div className="text-xs text-purple-600 font-medium">Tổng công ty</div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-purple-700">{filteredLicenses.reduce((sum, l) => sum + (l.companies?.length ?? l.current_companies ?? 0), 0)}</p>
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 lg:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo email, gói dịch vụ hoặc trạng thái..."
              className="pl-10 text-sm lg:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* License List - Responsive */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            Danh sách License
            {loading && <Clock className="h-4 w-4 animate-pulse text-gray-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 lg:p-6">
          {filteredLicenses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Mail className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Không tìm thấy license' : 'Chưa có license nào'}
              </h3>
              <p className="text-sm">
                {searchTerm
                  ? 'Thử tìm kiếm với từ khóa khác'
                  : 'Chưa có dữ liệu license. Thêm license mới từ Supabase hoặc công cụ quản trị.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLicenses.map((license) => (
                <div
                  key={license.id}
                  className="border rounded-lg hover:bg-gray-50 transition-colors overflow-hidden"
                >
                  {/* Main License Info */}
                  <div className="p-3 lg:p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left side - License info */}
                      <div className="flex-1 space-y-2">
                        {/* Email and badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span className="font-medium text-sm lg:text-base">{license.owner_email}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPlanColor(license.plan_type)}`}>
                            {license.plan_type.toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(license.status)}`}>
                            {license.status === 'active' ? 'Hoạt động' :
                             license.status === 'expired' ? 'Hết hạn' : 'Tạm dừng'}
                          </span>
                        </div>

                        {/* Stats grid - Mobile optimized */}
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-gray-600">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">{formatCurrency(license.price || 0)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Building2 className="h-3 w-3" />
                            <span>{license.companies?.length || 0}/{license.max_companies}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users className="h-3 w-3" />
                            <span>{license.members?.length || 0}/{license.max_members}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Package className="h-3 w-3" />
                            <span>{license.current_assets || 0} tài sản</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(license.valid_from).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span className={getDaysRemaining(license.valid_until) < 30 ? 'text-red-600 font-bold' : ''}>
                              {getDaysRemaining(license.valid_until)} ngày
                            </span>
                          </div>
                        </div>

                        {/* Notes */}
                        {license.notes && (
                          <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                            {license.notes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedLicense(expandedLicense === license.id ? null : license.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedLicense === license.id ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLicense(license)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLicense === license.id && (
                    <div className="border-t bg-gray-50 p-3 lg:p-4 space-y-3">
                      {/* Companies */}
                      {license.companies && license.companies.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Công ty ({license.companies.length})
                          </h4>
                          <div className="space-y-1">
                            {license.companies.map((company) => (
                              <div key={company.id} className="flex items-center gap-2 p-2 bg-white rounded text-xs">
                                <Building2 className="h-3 w-3 text-gray-400" />
                                <span className="flex-1">{company.name}</span>
                                <span className="text-gray-500">
                                  {new Date(company.created_at).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Members */}
                      {license.members && license.members.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Thành viên ({license.members.length})
                          </h4>
                          <div className="space-y-1">
                            {license.members.map((member) => (
                              <div key={member.id} className="flex items-center gap-2 p-2 bg-white rounded text-xs">
                                {member.role === 'owner' ? (
                                  <Crown className="h-3 w-3 text-yellow-600" />
                                ) : (
                                  <Shield className="h-3 w-3 text-blue-600" />
                                )}
                                <span className="flex-1">{member.email}</span>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  member.role === 'owner' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {member.role === 'owner' ? 'Chủ' : 'Thành viên'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

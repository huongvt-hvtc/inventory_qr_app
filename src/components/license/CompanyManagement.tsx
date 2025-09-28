'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Settings,
  Users,
  Trash2,
  Edit3,
  AlertCircle,
  Clock,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Company, License, LicenseUsageInfo } from '@/types/license';
import { SUBSCRIPTION_PLANS } from '@/types/license';

interface CompanyManagementProps {
  licenseInfo?: LicenseUsageInfo | null;
  onCompanyChange?: () => void;
}

export default function CompanyManagement({ licenseInfo, onCompanyChange }: CompanyManagementProps) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');

  // Check if user is license owner
  const isLicenseOwner = licenseInfo?.license?.owner_email === user?.email;

  // Load companies for current license
  const loadCompanies = async () => {
    if (!licenseInfo?.license?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('license_id', licenseInfo.license.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Không thể tải danh sách công ty');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [licenseInfo?.license?.id]);

  // Create new company
  const createCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Vui lòng nhập tên công ty');
      return;
    }

    if (!licenseInfo?.license?.id) {
      toast.error('Không tìm thấy thông tin license');
      return;
    }

    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể tạo công ty');
      return;
    }

    // Check company limits
    const planLimits = SUBSCRIPTION_PLANS[licenseInfo.license.plan_type];
    if (companies.length >= planLimits.max_companies && planLimits.max_companies !== 999) {
      toast.error(`Gói ${licenseInfo.license.plan_type} chỉ cho phép tối đa ${planLimits.max_companies} công ty`);
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: newCompanyName.trim(),
          license_id: licenseInfo.license.id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Đã tạo công ty "${newCompanyName}"`);
      setNewCompanyName('');
      await loadCompanies();
      onCompanyChange?.();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Không thể tạo công ty');
    } finally {
      setCreating(false);
    }
  };

  // Start editing company
  const startEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditName(company.name);
  };

  // Save company edit
  const saveCompanyEdit = async () => {
    if (!editingCompany || !editName.trim()) return;

    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể sửa tên công ty');
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: editName.trim() })
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast.success('Đã cập nhật tên công ty');
      setEditingCompany(null);
      setEditName('');
      await loadCompanies();
      onCompanyChange?.();
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Không thể cập nhật tên công ty');
    }
  };

  // Delete company
  const deleteCompany = async (company: Company) => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể xóa công ty');
      return;
    }

    if (companies.length <= 1) {
      toast.error('Không thể xóa công ty cuối cùng');
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa công ty "${company.name}"? Tất cả dữ liệu liên quan sẽ bị mất.`)) {
      try {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', company.id);

        if (error) throw error;

        toast.success(`Đã xóa công ty "${company.name}"`);
        await loadCompanies();
        onCompanyChange?.();
      } catch (error: any) {
        console.error('Error deleting company:', error);
        toast.error(error.message || 'Không thể xóa công ty');
      }
    }
  };

  if (!licenseInfo?.license) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Bạn cần kích hoạt license để quản lý công ty</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Quản lý Công ty
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal">
            {companies.length}/{(() => {
              const planLimits = SUBSCRIPTION_PLANS[licenseInfo.license.plan_type];
              const maxCompanies = planLimits?.max_companies || 1;
              return maxCompanies === 999 ? '∞' : maxCompanies;
            })()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">

          {/* Create Company Section - Only for license owners */}
          {isLicenseOwner && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Tạo công ty mới</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Nhập tên công ty..."
                  onKeyPress={(e) => e.key === 'Enter' && createCompany()}
                  className="flex-1"
                />
                <Button
                  onClick={createCompany}
                  disabled={creating || !newCompanyName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {creating ? (
                    <Clock className="h-4 w-4 mr-1 animate-pulse" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Tạo
                </Button>
              </div>
            </div>
          )}

          {/* Companies List */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>Danh sách công ty ({companies.length})</span>
              {loading && <Clock className="h-4 w-4 animate-pulse text-gray-400" />}
            </div>

            {companies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Chưa có công ty nào</p>
                {isLicenseOwner && (
                  <p className="text-sm mt-2">Tạo công ty đầu tiên để bắt đầu</p>
                )}
              </div>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="p-4 border rounded-lg bg-gray-50 border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Company Icon */}
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>

                    {/* Company Info */}
                    <div className="flex-1">
                      {editingCompany?.id === company.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && saveCompanyEdit()}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={saveCompanyEdit}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCompany(null)}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900">
                            {company.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            Tạo lúc: {new Date(company.created_at).toLocaleDateString('vi-VN')}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons - Only for license owners */}
                    {isLicenseOwner && editingCompany?.id !== company.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditCompany(company)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {companies.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCompany(company)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Company Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>🏢 Thông tin công ty:</strong></p>
            <p>• Mỗi license có thể tạo nhiều công ty</p>
            <p>• Chủ sở hữu license có thể tạo/sửa/xóa công ty</p>
            <p>• Gói {licenseInfo.license.plan_type} cho phép tối đa {(() => {
              const planLimits = SUBSCRIPTION_PLANS[licenseInfo.license.plan_type];
              const maxCompanies = planLimits?.max_companies || 1;
              return maxCompanies === 999 ? 'không giới hạn' : maxCompanies;
            })()} công ty</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
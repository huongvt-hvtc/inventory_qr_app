'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Eye,
  Trash2,
  Building2,
  Users,
  Calendar,
  Crown,
  Shield,
  AlertCircle,
  Check,
  Clock,
  X,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { License, LicenseCreationRequest, Company, LicenseMember } from '@/types/license';
import { SUBSCRIPTION_PLANS } from '@/types/license';

interface LicenseWithDetails extends License {
  companies?: Company[];
  members?: LicenseMember[];
}

export default function EmailLicenseManagement() {
  const [licenses, setLicenses] = useState<LicenseWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<LicenseCreationRequest>({
    owner_email: '',
    plan_type: 'basic',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    max_members: 5,
    max_companies: 3,
    price: 5000000,
    notes: ''
  });

  // Load all licenses with details
  const loadLicenses = async () => {
    setLoading(true);
    try {
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (licenseError) throw licenseError;

      // Load companies and members for each license
      const licensesWithDetails: LicenseWithDetails[] = [];

      for (const license of licenseData || []) {
        // Load companies
        const { data: companies, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('license_id', license.id);

        if (companyError) throw companyError;

        // Load members
        const { data: members, error: memberError } = await supabase
          .from('license_members')
          .select('*')
          .eq('license_id', license.id);

        if (memberError) throw memberError;

        // Count assets
        let totalAssets = 0;
        for (const company of companies || []) {
          const { count } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          totalAssets += count || 0;
        }

        licensesWithDetails.push({
          ...license,
          companies: companies || [],
          members: members || [],
          current_assets: totalAssets
        });
      }

      setLicenses(licensesWithDetails);
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

  // Auto-update price when plan changes
  useEffect(() => {
    const planPrices: Record<string, number> = {
      basic: 5000000,
      pro: 12000000,
      max: 25000000,
      enterprise: 50000000
    };
    setFormData(prev => ({ ...prev, price: planPrices[prev.plan_type] || 5000000 }));
  }, [formData.plan_type]);

  // Create new license
  const createLicense = async () => {
    if (!formData.owner_email.trim() || !formData.owner_email.includes('@')) {
      toast.error('Vui lòng nhập email hợp lệ');
      return;
    }

    // Check if email already has a license
    const existingLicense = licenses.find(l => l.owner_email.toLowerCase() === formData.owner_email.toLowerCase());
    if (existingLicense) {
      toast.error('Email này đã có license');
      return;
    }

    setCreating(true);
    try {
      const planLimits = SUBSCRIPTION_PLANS[formData.plan_type];

      // Create license
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .insert({
          owner_email: formData.owner_email.trim(),
          plan_type: formData.plan_type,
          valid_from: formData.valid_from,
          valid_until: formData.valid_until,
          status: 'active',
          max_companies: formData.max_companies,
          max_users: planLimits.max_users,
          max_assets: planLimits.max_assets,
          max_members: formData.max_members,
          current_companies: 0,
          current_users: 0,
          current_assets: 0,
          current_members: 1, // Owner counts as 1 member
          price: formData.price,
          notes: formData.notes,
          features: { plan_features: planLimits.features },
          total_api_calls: 0
        })
        .select()
        .single();

      if (licenseError) throw licenseError;

      // Create owner as first member
      const { error: memberError } = await supabase
        .from('license_members')
        .insert({
          license_id: licenseData.id,
          email: formData.owner_email.trim(),
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (memberError) throw memberError;

      toast.success(`✅ Đã tạo license cho ${formData.owner_email}`);
      setShowCreateForm(false);
      setFormData({
        owner_email: '',
        plan_type: 'basic',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        max_members: 5,
        max_companies: 3,
        price: 5000000,
        notes: ''
      });
      await loadLicenses();
    } catch (error: any) {
      console.error('Error creating license:', error);
      toast.error(error.message || 'Không thể tạo license');
    } finally {
      setCreating(false);
    }
  };

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
            Quản lý License
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý license theo email - {filteredLicenses.length} license
          </p>
        </div>

        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full lg:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tạo License
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 lg:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo email hoặc gói..."
              className="pl-10 text-sm lg:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create License Form */}
      {showCreateForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-blue-600" />
                Tạo License Mới
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Email chủ sở hữu</label>
                <Input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                  placeholder="owner@company.com"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Gói License</label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_type: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="basic">Basic - 5M VNĐ/năm</option>
                  <option value="pro">Pro - 12M VNĐ/năm</option>
                  <option value="max">Max - 25M VNĐ/năm</option>
                  <option value="enterprise">Enterprise - 50M VNĐ/năm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Giá tiền (VNĐ)</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  placeholder="500000"
                  min="0"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Ngày hết hạn</label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Số user tối đa</label>
                <Input
                  type="number"
                  value={formData.max_members}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) || 1 }))}
                  placeholder="5"
                  min="1"
                  className="text-sm"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium mb-1">Số danh sách tài sản (công ty)</label>
                <Input
                  type="number"
                  value={formData.max_companies}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_companies: parseInt(e.target.value) || 1 }))}
                  placeholder="3"
                  min="1"
                  className="text-sm"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium mb-1">Ghi chú</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ghi chú về license..."
                  className="text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={createLicense}
                disabled={creating || !formData.owner_email.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {creating ? (
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Tạo License
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo license đầu tiên để bắt đầu'}
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
                          {expandedLicense === license.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
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

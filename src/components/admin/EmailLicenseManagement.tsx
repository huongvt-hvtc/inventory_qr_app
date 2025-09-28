'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Eye,
  Edit3,
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
  Search
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
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithDetails | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<LicenseCreationRequest>({
    owner_email: '',
    plan_type: 'basic',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    max_members: 5,
    max_companies: 3,
    price: 500000,
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

        licensesWithDetails.push({
          ...license,
          companies: companies || [],
          members: members || []
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
          invited_at: new Date().toISOString(),
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
        price: 500000,
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
        // Delete in order: company_permissions -> companies -> license_members -> license

        // Delete company permissions
        for (const company of license.companies || []) {
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
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'suspended': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'enterprise': return 'bg-purple-100 text-purple-700';
      case 'max': return 'bg-blue-100 text-blue-700';
      case 'pro': return 'bg-green-100 text-green-700';
      case 'basic': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Quản lý Email License
          </h1>
          <p className="text-gray-600 mt-1">
            Quản lý license theo email - Hệ thống mới đơn giản hơn
          </p>
        </div>

        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tạo License
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo email hoặc gói..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create License Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email chủ sở hữu</label>
                <Input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                  placeholder="owner@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gói License</label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_type: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="basic">Basic - 5M VNĐ/năm</option>
                  <option value="pro">Pro - 12M VNĐ/năm</option>
                  <option value="max">Max - 25M VNĐ/năm</option>
                  <option value="enterprise">Enterprise - 50M VNĐ/năm</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ngày hết hạn</label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Số email được dùng chung</label>
                <Input
                  type="number"
                  value={formData.max_members}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) || 1 }))}
                  placeholder="5"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Số công ty được tạo</label>
                <Input
                  type="number"
                  value={formData.max_companies}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_companies: parseInt(e.target.value) || 1 }))}
                  placeholder="3"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Giá tiền (VNĐ)</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  placeholder="500000"
                  min="0"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-2">Ghi chú</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ghi chú về license..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
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

      {/* License List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Danh sách License ({filteredLicenses.length})
            {loading && <Clock className="h-4 w-4 animate-pulse text-gray-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-4">
              {filteredLicenses.map((license) => (
                <div
                  key={license.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* License Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-lg">{license.owner_email}</span>

                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPlanColor(license.plan_type)}`}>
                          {license.plan_type.toUpperCase()}
                        </span>

                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(license.status)}`}>
                          {license.status === 'active' ? 'Hoạt động' :
                           license.status === 'expired' ? 'Hết hạn' : 'Tạm dừng'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{license.companies?.length || 0} công ty</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{license.members?.length || 0} thành viên</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Đến {new Date(license.valid_until).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div>
                          <span>{SUBSCRIPTION_PLANS[license.plan_type]?.price_display}</span>
                        </div>
                      </div>

                      {license.notes && (
                        <div className="mt-2 text-sm text-gray-500 italic">
                          {license.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLicense(license)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Details Modal */}
      {selectedLicense && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Chi tiết License: {selectedLicense.owner_email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLicense(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* License Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Building2 className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                  <div className="text-lg font-bold">{selectedLicense.companies?.length || 0}</div>
                  <div className="text-xs text-gray-600">Công ty</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Users className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <div className="text-lg font-bold">{selectedLicense.members?.length || 0}</div>
                  <div className="text-xs text-gray-600">Thành viên</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
                  <div className="text-lg font-bold">
                    {Math.ceil((new Date(selectedLicense.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-xs text-gray-600">Ngày còn lại</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Crown className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                  <div className="text-lg font-bold">{selectedLicense.plan_type.toUpperCase()}</div>
                  <div className="text-xs text-gray-600">Gói</div>
                </div>
              </div>

              {/* Companies */}
              {selectedLicense.companies && selectedLicense.companies.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Công ty ({selectedLicense.companies.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedLicense.companies.map((company) => (
                      <div key={company.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="flex-1">{company.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(company.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members */}
              {selectedLicense.members && selectedLicense.members.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Thành viên ({selectedLicense.members.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedLicense.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        {member.role === 'owner' ? (
                          <Crown className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <Shield className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="flex-1">{member.email}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Building,
  Users,
  Package,
  Calendar,
  Shield,
  Download,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import type { LicenseKey } from '@/types/license';
import { SUBSCRIPTION_PLANS } from '@/types/license';
import toast from 'react-hot-toast';

interface KeyGenerationForm {
  company_name: string;
  customer_email: string;
  plan_type: 'basic' | 'pro' | 'enterprise';
  valid_months: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAccess();
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  const [formData, setFormData] = useState<KeyGenerationForm>({
    company_name: '',
    customer_email: '',
    plan_type: 'basic',
    valid_months: 12
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.email) {
        toast.error('Bạn cần đăng nhập để truy cập trang này');
        window.location.href = '/';
        return;
      }

      if (!isAdmin) {
        toast.error('Bạn không có quyền truy cập trang này');
        window.location.href = '/';
        return;
      }

      // If admin, proceed to load licenses
      loadLicenses();
    };

    checkAdminAccess();
  }, [user, isAdmin]);

  // Load all license keys
  const loadLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('license_keys')
        .select(`
          *,
          companies:companies(count),
          recent_activity:license_activity_logs(
            action,
            performed_at,
            details
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLicenses(data || []);
    } catch (error) {
      console.error('Error loading licenses:', error);
      toast.error('Không thể tải danh sách license');
    } finally {
      setLoading(false);
    }
  };

  // Generate new license key
  const generateLicenseKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim() || !formData.customer_email.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setGeneratingKey(true);

    try {
      // Generate unique key code
      const year = new Date().getFullYear();
      const planPrefix = formData.plan_type.toUpperCase();
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const keyCode = `INV-${year}-${planPrefix}-${randomCode}`;

      const planLimits = SUBSCRIPTION_PLANS[formData.plan_type];
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + formData.valid_months);

      const { data, error } = await supabase
        .from('license_keys')
        .insert({
          key_code: keyCode,
          company_name: formData.company_name,
          customer_email: formData.customer_email,
          plan_type: formData.plan_type,
          max_companies: planLimits.max_companies,
          max_users: planLimits.max_users,
          max_assets: planLimits.max_assets,
          valid_from: validFrom.toISOString().split('T')[0],
          valid_until: validUntil.toISOString().split('T')[0],
          features: { plan_features: planLimits.features },
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('🎉 License key đã được tạo thành công!');

      // Reset form
      setFormData({
        company_name: '',
        customer_email: '',
        plan_type: 'basic',
        valid_months: 12
      });
      setShowGenerateForm(false);

      // Reload licenses
      await loadLicenses();

      // Show generated key
      toast.success(`License key: ${keyCode}`, { duration: 10000 });

    } catch (error: any) {
      console.error('Error generating license:', error);
      toast.error(error.message || 'Không thể tạo license key');
    } finally {
      setGeneratingKey(false);
    }
  };

  // Filter licenses based on search
  const filteredLicenses = licenses.filter(license =>
    license.key_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export licenses to CSV
  const exportLicenses = () => {
    const csvContent = [
      ['Key Code', 'Company', 'Email', 'Plan', 'Status', 'Valid Until', 'Companies', 'Users', 'Assets'],
      ...filteredLicenses.map(license => [
        license.key_code,
        license.company_name,
        license.customer_email || '',
        license.plan_type,
        license.status,
        license.valid_until,
        license.current_companies,
        license.current_users,
        license.current_assets
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-600" />
              Admin - Quản lý License
            </h1>

            <div className="flex items-center gap-3">
              <Button
                onClick={loadLicenses}
                disabled={loading}
                variant="outline"
                className="h-10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>

              <Button
                onClick={exportLicenses}
                variant="outline"
                className="h-10"
              >
                <Download className="h-4 w-4 mr-2" />
                Xuất CSV
              </Button>

              <Button
                onClick={() => setShowGenerateForm(!showGenerateForm)}
                className="h-10 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo License
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Generate Form */}
          {showGenerateForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-purple-600" />
                  Tạo License Key Mới
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={generateLicenseKey} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tên công ty *</label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Tên công ty khách hàng"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Email khách hàng *</label>
                    <Input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="email@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Gói dịch vụ</label>
                    <select
                      value={formData.plan_type}
                      onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as any })}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="basic">Basic - 5,000,000 VNĐ/năm</option>
                      <option value="pro">Pro - 12,000,000 VNĐ/năm</option>
                      <option value="enterprise">Enterprise - 25,000,000 VNĐ/năm</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Thời hạn (tháng)</label>
                    <Input
                      type="number"
                      min="1"
                      max="36"
                      value={formData.valid_months}
                      onChange={(e) => setFormData({ ...formData, valid_months: parseInt(e.target.value) })}
                      placeholder="12"
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGenerateForm(false)}
                      className="flex-1"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={generatingKey}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingKey ? 'Đang tạo...' : 'Tạo License'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo key code, tên công ty, email..."
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredLicenses.length} / {licenses.length} licenses
            </div>
          </div>

          {/* Licenses List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredLicenses.map((license) => (
              <Card key={license.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-bold text-purple-600 truncate">
                        {license.key_code}
                      </div>
                      <div className="font-medium text-gray-900 truncate">
                        {license.company_name}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {license.customer_email}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(license.status)}`}>
                      {license.status}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Plan & Expiry */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{license.plan_type}</span>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {formatDate(license.valid_until)}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <Building className="h-3 w-3 mx-auto mb-1 text-purple-600" />
                      <div className="font-medium">{license.current_companies}/{license.max_companies}</div>
                      <div className="text-gray-600">Công ty</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <Users className="h-3 w-3 mx-auto mb-1 text-green-600" />
                      <div className="font-medium">{license.current_users}/{license.max_users}</div>
                      <div className="text-gray-600">Users</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <Package className="h-3 w-3 mx-auto mb-1 text-blue-600" />
                      <div className="font-medium">{license.current_assets}/{license.max_assets}</div>
                      <div className="text-gray-600">Assets</div>
                    </div>
                  </div>

                  {/* Last Used */}
                  {license.last_used_at && (
                    <div className="text-xs text-gray-500">
                      Last used: {formatDate(license.last_used_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLicenses.length === 0 && (
            <div className="text-center py-16">
              <Key className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Không tìm thấy license' : 'Chưa có license nào'}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Thử thay đổi từ khóa tìm kiếm' : 'Tạo license đầu tiên để bắt đầu'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
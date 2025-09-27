'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Search,
  Building,
  Users,
  Package,
  Calendar,
  Download,
  RefreshCw,
  Edit,
  Eye,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { LicenseKey } from '@/types/license';
import { SUBSCRIPTION_PLANS } from '@/types/license';
import toast from 'react-hot-toast';

interface KeyGenerationForm {
  company_name: string;
  customer_email: string;
  plan_type: 'basic' | 'pro' | 'enterprise';
  valid_months: number;
  price: number;
  notes: string;
}

export default function LicenseManagement() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseKey | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [formData, setFormData] = useState<KeyGenerationForm>({
    company_name: '',
    customer_email: '',
    plan_type: 'basic',
    valid_months: 12,
    price: 5000000,
    notes: ''
  });

  // Load licenses on component mount
  useEffect(() => {
    loadLicenses();
  }, []);

  // Update price when plan changes
  useEffect(() => {
    const planPrices = {
      basic: 5000000,
      pro: 12000000,
      enterprise: 25000000
    };
    setFormData(prev => ({ ...prev, price: planPrices[prev.plan_type] }));
  }, [formData.plan_type]);

  // Load all license keys with comprehensive data
  const loadLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('license_keys')
        .select(`
          *,
          companies:companies(
            id,
            name,
            contact_email,
            phone,
            address,
            created_at
          ),
          license_activity_logs:license_activity_logs(
            action,
            performed_at
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
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const planPrefix = formData.plan_type.toUpperCase();
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const keyCode = `INV-${year}${month}-${planPrefix}-${randomCode}`;

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
          max_emails: planLimits.max_emails,
          valid_from: validFrom.toISOString().split('T')[0],
          valid_until: validUntil.toISOString().split('T')[0],
          features: { plan_features: planLimits.features },
          created_by: user?.id,
          price: formData.price,
          notes: formData.notes
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
        valid_months: 12,
        price: 5000000,
        notes: ''
      });
      setShowGenerateForm(false);

      // Reload licenses
      await loadLicenses();

      // Show generated key with copy functionality
      navigator.clipboard.writeText(keyCode);
      toast.success(`License key: ${keyCode} (đã copy vào clipboard)`, { duration: 10000 });

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
    license.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.plan_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export licenses to CSV
  const exportLicenses = () => {
    const csvContent = [
      ['Key Code', 'Company', 'Email', 'Plan', 'Status', 'Valid From', 'Valid Until', 'Price', 'Companies', 'Users', 'Assets', 'Emails', 'Notes'],
      ...filteredLicenses.map(license => [
        license.key_code,
        license.company_name,
        license.customer_email || '',
        license.plan_type,
        license.status,
        license.valid_from,
        license.valid_until,
        license.price || 0,
        license.current_companies,
        license.current_users,
        license.current_assets,
        license.current_emails || 0,
        license.notes || ''
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'expired': return XCircle;
      case 'suspended': return AlertCircle;
      default: return Clock;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy vào clipboard');
  };

  const showLicenseDetails = (license: LicenseKey) => {
    setSelectedLicense(license);
    setShowDetails(true);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý Licenses</h1>
        <p className="text-gray-600">Tạo, chỉnh sửa và theo dõi các license keys</p>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={loadLicenses}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>

          <Button
            onClick={exportLicenses}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>

        <Button
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tạo License Mới
        </Button>
      </div>

      {/* Generate Form */}
      {showGenerateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600" />
              Tạo License Key Mới
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateLicenseKey} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="basic">Basic - 1 email - 5,000,000 VNĐ/năm</option>
                    <option value="pro">Pro - 5 emails - 12,000,000 VNĐ/năm</option>
                    <option value="enterprise">Enterprise - 10 emails - 25,000,000 VNĐ/năm</option>
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

                <div>
                  <label className="text-sm font-medium text-gray-700">Giá (VNĐ)</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    placeholder="5000000"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Ghi chú</label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ghi chú về license này..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
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
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo key code, tên công ty, email, plan..."
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredLicenses.length} / {licenses.length} licenses
        </div>
      </div>

      {/* Licenses List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLicenses.map((license) => {
          const StatusIcon = getStatusIcon(license.status);
          return (
            <Card key={license.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-mono text-xs font-bold text-purple-600 truncate">
                        {license.key_code}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(license.key_code)}
                        className="h-6 w-6 p-0 hover:bg-purple-100"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-medium text-gray-900 truncate">
                      {license.company_name}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {license.customer_email}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(license.status)}`}>
                    <StatusIcon className="h-3 w-3" />
                    {license.status}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Plan & Price */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{license.plan_type}</span>
                  <div className="font-bold text-green-600">
                    {formatPrice(license.price || 0)}
                  </div>
                </div>

                {/* Validity */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Hạn sử dụng</span>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="h-3 w-3" />
                    {formatDate(license.valid_from)} - {formatDate(license.valid_until)}
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
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
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <Key className="h-3 w-3 mx-auto mb-1 text-orange-600" />
                    <div className="font-medium">{license.current_emails || 0}/{license.max_emails || 0}</div>
                    <div className="text-gray-600">Emails</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showLicenseDetails(license)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Chi tiết
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Sửa
                  </Button>
                </div>

                {/* Notes */}
                {license.notes && (
                  <div className="text-xs text-gray-500 italic border-t pt-2">
                    {license.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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

      {/* License Details Modal would go here */}
    </div>
  );
}
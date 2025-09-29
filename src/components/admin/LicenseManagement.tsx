'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Search,
  Building,
  Users,
  Package,
  Calendar,
  Download,
  RefreshCw,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Mail,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { License } from '@/types/license';
import toast from 'react-hot-toast';

export default function LicenseManagement() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [showDetails, setShowDetails] = useState(false);


  // Load licenses on component mount
  useEffect(() => {
    loadLicenses();
  }, []);

  // Load all licenses with comprehensive data
  const loadLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          *,
          license_members:license_members(
            email,
            role,
            status,
            joined_at
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


  // Filter licenses based on search
  const filteredLicenses = licenses.filter(license =>
    license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.plan_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.license_members?.some(member =>
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Export licenses to CSV
  const exportLicenses = () => {
    const csvContent = [
      ['License Name', 'Plan', 'Status', 'Owner Email', 'Members Count', 'Created Date', 'Expires Date'],
      ...filteredLicenses.map(license => [
        license.name,
        license.plan_type,
        license.status,
        license.license_members?.find(m => m.role === 'owner')?.email || '',
        license.license_members?.length || 0,
        license.created_at ? new Date(license.created_at).toLocaleDateString('vi-VN') : '',
        license.expires_at ? new Date(license.expires_at).toLocaleDateString('vi-VN') : ''
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

  const showLicenseDetails = (license: License) => {
    setSelectedLicense(license);
    setShowDetails(true);
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 pt-2 md:pt-3">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Quản lý Licenses</h1>
        <p className="text-sm md:text-base text-gray-600">Theo dõi và quản lý các license email-based</p>
      </div>

      {/* Action Bar */}
      <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            onClick={loadLicenses}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none min-w-0"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
            <span className="sm:hidden">Refresh</span>
          </Button>

          <Button
            onClick={exportLicenses}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none min-w-0"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Xuất CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>

        <Button
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          size="sm"
          onClick={() => window.open('/admin/email-licenses', '_blank')}
        >
          <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Quản lý Email License</span>
          <span className="sm:hidden">Email License</span>
        </Button>
      </div>


      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm theo key code, công ty, email..."
            className="pl-8 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
          />
        </div>
        <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left whitespace-nowrap">
          {filteredLicenses.length} / {licenses.length} licenses
        </div>
      </div>

      {/* Licenses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        {filteredLicenses.map((license) => {
          const StatusIcon = getStatusIcon(license.status);
          const ownerEmail = license.license_members?.find(m => m.role === 'owner')?.email;
          const memberCount = license.license_members?.length || 0;

          return (
            <Card key={license.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="font-bold text-sm sm:text-base text-gray-900 truncate">
                        {license.name}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate">
                      {ownerEmail || 'No owner assigned'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {memberCount} thành viên
                    </div>
                  </div>
                  <div className={`px-1.5 sm:px-2 py-1 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0 ${getStatusColor(license.status)}`}>
                    <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden sm:inline">{license.status}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-4 pt-0">
                {/* Plan Type */}
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {license.plan_type}
                  </span>
                  <div className="text-xs text-gray-500">
                    ID: {license.id}
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">Thời hạn</span>
                  </div>
                  <div className="text-gray-800">
                    Tạo: {formatDate(license.created_at)}
                  </div>
                  {license.expires_at && (
                    <div className="text-gray-800">
                      Hết hạn: {formatDate(license.expires_at)}
                    </div>
                  )}
                </div>

                {/* License Members */}
                <div className="bg-blue-50 p-2 rounded text-xs">
                  <div className="flex items-center gap-1 text-blue-600 mb-1">
                    <Mail className="h-3 w-3" />
                    <span className="font-medium">Thành viên ({memberCount})</span>
                  </div>
                  <div className="space-y-1">
                    {license.license_members?.slice(0, 2).map((member, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-700 truncate">{member.email}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          member.role === 'owner'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                    {memberCount > 2 && (
                      <div className="text-gray-500 text-center">
                        +{memberCount - 2} thành viên khác
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 sm:gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showLicenseDetails(license)}
                    className="flex-1 text-xs sm:text-sm h-7 sm:h-8"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Chi tiết</span>
                    <span className="sm:hidden">Xem</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs sm:text-sm h-7 sm:h-8"
                    onClick={() => window.open(`/admin/email-licenses?license=${license.id}`, '_blank')}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Quản lý</span>
                    <span className="sm:hidden">Sửa</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLicenses.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mx-auto max-w-md">
            <Key className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Không tìm thấy license' : 'Chưa có license nào'}
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              {searchTerm ? 'Thử thay đổi từ khóa tìm kiếm' : 'Quản lý license thông qua Email License Management'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => window.open('/admin/email-licenses', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Quản lý Email License
              </Button>
            )}
          </div>
        </div>
      )}

      {/* License Details Modal would go here */}
    </div>
  );
}
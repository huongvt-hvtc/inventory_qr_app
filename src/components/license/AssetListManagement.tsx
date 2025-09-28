'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Settings,
  Trash2,
  Edit3,
  Users,
  Eye,
  EyeOff,
  Clock,
  Check,
  AlertCircle,
  Shield,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Company, LicenseMember, LicenseUsageInfo, CompanyPermission } from '@/types/license';

interface AssetListManagementProps {
  licenseInfo?: LicenseUsageInfo | null;
  companies: Company[];
  members: LicenseMember[];
  onPermissionChange?: () => void;
}

interface CompanyWithPermissions extends Company {
  permissions?: CompanyPermission[];
  assets_count?: number;
}

export default function AssetListManagement({
  licenseInfo,
  companies,
  members,
  onPermissionChange
}: AssetListManagementProps) {
  const { user } = useAuth();
  const [companiesWithData, setCompaniesWithData] = useState<CompanyWithPermissions[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);

  // Check if user is license owner
  const isLicenseOwner = licenseInfo?.license?.owner_email === user?.email;

  // Load companies with permissions and asset counts
  const loadCompaniesData = async () => {
    if (!licenseInfo?.license?.id || companies.length === 0) {
      setCompaniesWithData([]);
      return;
    }

    setLoading(true);
    try {
      const companiesWithData: CompanyWithPermissions[] = await Promise.all(
        companies.map(async (company) => {
          // Load permissions for this company
          const { data: permissions, error: permError } = await supabase
            .from('company_permissions')
            .select(`
              *,
              member:license_members(*)
            `)
            .eq('company_id', company.id);

          if (permError) {
            console.error('Error loading permissions:', permError);
          }

          // Load asset count for this company
          const { count: assetsCount, error: countError } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

          if (countError) {
            console.error('Error loading asset count:', countError);
          }

          return {
            ...company,
            permissions: permissions || [],
            assets_count: assetsCount || 0
          };
        })
      );

      setCompaniesWithData(companiesWithData);
    } catch (error) {
      console.error('Error loading companies data:', error);
      toast.error('Không thể tải dữ liệu danh sách tài sản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompaniesData();
  }, [licenseInfo?.license?.id, companies, members]);

  // Grant permission to member for company
  const grantPermission = async (companyId: string, memberId: string, role: 'admin' | 'member' | 'viewer') => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể phân quyền');
      return;
    }

    try {
      const { error } = await supabase
        .from('company_permissions')
        .upsert({
          company_id: companyId,
          license_member_id: memberId,
          role: role,
          granted_by: user?.email,
          granted_at: new Date().toISOString()
        });

      if (error) throw error;

      const member = members.find(m => m.id === memberId);
      const company = companiesWithData.find(c => c.id === companyId);
      toast.success(`Đã cấp quyền ${role} cho ${member?.email} tại công ty ${company?.name}`);

      await loadCompaniesData();
      onPermissionChange?.();
    } catch (error: any) {
      console.error('Error granting permission:', error);
      toast.error(error.message || 'Không thể cấp quyền');
    }
  };

  // Revoke permission
  const revokePermission = async (permissionId: string) => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể thu hồi quyền');
      return;
    }

    try {
      const { error } = await supabase
        .from('company_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      toast.success('Đã thu hồi quyền truy cập');
      await loadCompaniesData();
      onPermissionChange?.();
    } catch (error: any) {
      console.error('Error revoking permission:', error);
      toast.error(error.message || 'Không thể thu hồi quyền');
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'member':
        return 'bg-blue-100 text-blue-700';
      case 'viewer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'member':
        return <UserCheck className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  // Toggle company expansion
  const toggleCompanyExpansion = (companyId: string) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
  };

  if (!licenseInfo?.license) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Bạn cần kích hoạt license để quản lý danh sách tài sản</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-purple-600" />
          Quản lý Danh sách Tài sản & Phân quyền
          <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-normal">
            {companiesWithData.length} công ty
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">

          {/* Companies List with Permissions */}
          {companiesWithData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Chưa có danh sách tài sản nào</p>
              <p className="text-sm mt-2">Tạo công ty trước để quản lý tài sản</p>
            </div>
          ) : (
            companiesWithData.map((company) => (
              <div
                key={company.id}
                className="border rounded-lg bg-white border-gray-200 transition-all duration-200"
              >
                {/* Company Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCompanyExpansion(company.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-4">
                          <span>{company.assets_count || 0} tài sản</span>
                          <span>{company.permissions?.length || 0} người có quyền</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedCompany === company.id ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Permissions Details */}
                {expandedCompany === company.id && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-4 space-y-4">

                      {/* Current Permissions */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Quyền truy cập hiện tại ({company.permissions?.length || 0})
                        </h4>

                        {company.permissions && company.permissions.length > 0 ? (
                          <div className="space-y-2">
                            {company.permissions.map((permission: any) => (
                              <div
                                key={permission.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    {getRoleIcon(permission.role)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm text-gray-900">
                                      {permission.member?.email || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Cấp quyền: {new Date(permission.granted_at).toLocaleDateString('vi-VN')}
                                    </div>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getRoleBadgeColor(permission.role)}`}>
                                    {getRoleIcon(permission.role)}
                                    {permission.role === 'admin' ? 'Quản trị' :
                                     permission.role === 'member' ? 'Thành viên' : 'Xem'}
                                  </span>
                                </div>

                                {isLicenseOwner && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => revokePermission(permission.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 bg-white rounded-lg border">
                            <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">Chưa có ai được phân quyền</p>
                          </div>
                        )}
                      </div>

                      {/* Add Permissions - Only for license owners */}
                      {isLicenseOwner && members.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            Cấp quyền cho thành viên
                          </h4>
                          <div className="space-y-2">
                            {members
                              .filter(member => member.role !== 'owner' && member.status === 'active')
                              .filter(member => !company.permissions?.some((p: any) => p.license_member_id === member.id))
                              .map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                      <Users className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm text-gray-900">{member.email}</div>
                                      <div className="text-xs text-gray-600">Chọn mức quyền để cấp phép</div>
                                    </div>
                                  </div>

                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => grantPermission(company.id, member.id, 'viewer')}
                                      className="text-gray-600 hover:bg-gray-50 text-xs"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Xem
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => grantPermission(company.id, member.id, 'member')}
                                      className="text-blue-600 hover:bg-blue-50 text-xs"
                                    >
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Thành viên
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => grantPermission(company.id, member.id, 'admin')}
                                      className="text-red-600 hover:bg-red-50 text-xs"
                                    >
                                      <Shield className="h-3 w-3 mr-1" />
                                      Quản trị
                                    </Button>
                                  </div>
                                </div>
                              ))}

                            {members.filter(member =>
                              member.role !== 'owner' &&
                              member.status === 'active' &&
                              !company.permissions?.some((p: any) => p.license_member_id === member.id)
                            ).length === 0 && (
                              <div className="text-center py-4 text-gray-500 bg-white rounded-lg border">
                                <Check className="h-8 w-8 mx-auto mb-2 text-green-400" />
                                <p className="text-sm">Tất cả thành viên đã được phân quyền</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Permission Levels Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>📋 Phân quyền danh sách tài sản:</strong></p>
            <p>• <strong>Quản trị:</strong> Có thể xem, thêm, sửa, xóa tài sản</p>
            <p>• <strong>Thành viên:</strong> Có thể xem và thêm tài sản</p>
            <p>• <strong>Xem:</strong> Chỉ có thể xem danh sách tài sản</p>
            <p>• Chủ sở hữu license tự động có quyền quản trị tất cả công ty</p>
          </div>

          {loading && (
            <div className="text-center py-4">
              <Clock className="h-6 w-6 mx-auto animate-pulse text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Đang tải dữ liệu...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
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
  Check,
  Package,
  Eye,
  EyeOff,
  Shield,
  UserCheck,
  Crown,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Company, License, LicenseUsageInfo, LicenseMember, CompanyPermission } from '@/types/license';
import { SUBSCRIPTION_PLANS } from '@/types/license';

interface CompanyWithPermissions extends Company {
  permissions?: CompanyPermission[];
  assets_count?: number;
}

interface UnifiedCompanyManagementProps {
  licenseInfo?: LicenseUsageInfo | null;
  onDataChange?: () => void;
}

export default function UnifiedCompanyManagement({ licenseInfo, onDataChange }: UnifiedCompanyManagementProps) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyWithPermissions[]>([]);
  const [members, setMembers] = useState<LicenseMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  // Check if user is license owner
  const isLicenseOwner = licenseInfo?.license?.owner_email === user?.email;

  // Load companies with permissions
  const loadCompaniesData = async () => {
    if (!licenseInfo?.license?.id) return;

    setLoading(true);
    try {
      // Load companies
      const { data: companiesData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('license_id', licenseInfo.license.id)
        .order('created_at', { ascending: true });

      if (companyError) throw companyError;

      // Load members
      const { data: membersData, error: memberError } = await supabase
        .from('license_members')
        .select('*')
        .eq('license_id', licenseInfo.license.id)
        .order('joined_at', { ascending: true });

      if (memberError) throw memberError;
      setMembers(membersData || []);

      // Load permissions and asset counts for each company
      const companiesWithData: CompanyWithPermissions[] = await Promise.all(
        (companiesData || []).map(async (company) => {
          // Load permissions
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

          // Load asset count
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

      setCompanies(companiesWithData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompaniesData();
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
    if (companies.length >= licenseInfo.license.max_companies) {
      toast.error(`Đã đạt giới hạn ${licenseInfo.license.max_companies} công ty`);
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
      await loadCompaniesData();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Không thể tạo công ty');
    } finally {
      setCreating(false);
    }
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
      await loadCompaniesData();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Không thể cập nhật tên công ty');
    }
  };

  // Delete company
  const deleteCompany = async (company: CompanyWithPermissions) => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể xóa công ty');
      return;
    }

    if (company.assets_count && company.assets_count > 0) {
      toast.error(`Không thể xóa công ty có ${company.assets_count} tài sản. Vui lòng xóa tất cả tài sản trước.`);
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa công ty "${company.name}"?`)) {
      try {
        // Delete permissions first
        const { error: permError } = await supabase
          .from('company_permissions')
          .delete()
          .eq('company_id', company.id);

        if (permError) throw permError;

        // Delete company
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', company.id);

        if (error) throw error;

        toast.success(`Đã xóa công ty "${company.name}"`);
        await loadCompaniesData();
        onDataChange?.();
      } catch (error: any) {
        console.error('Error deleting company:', error);
        toast.error(error.message || 'Không thể xóa công ty');
      }
    }
  };

  // Grant permission
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
      const company = companies.find(c => c.id === companyId);
      toast.success(`Đã cấp quyền ${role} cho ${member?.email}`);

      await loadCompaniesData();
      onDataChange?.();
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
      onDataChange?.();
    } catch (error: any) {
      console.error('Error revoking permission:', error);
      toast.error(error.message || 'Không thể thu hồi quyền');
    }
  };

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

  if (!isLicenseOwner) {
    return null; // Don't show this section for non-owners
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Quản lý Công ty & Phân quyền
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal">
            {companies.length}/{licenseInfo.license.max_companies}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          {/* Create Company */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Tạo danh sách tài sản mới (công ty)</span>
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
                disabled={creating || !newCompanyName.trim() || companies.length >= licenseInfo.license.max_companies}
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

          {/* Companies List */}
          {companies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Chưa có công ty nào</p>
              <p className="text-sm mt-2">Tạo công ty đầu tiên để bắt đầu quản lý tài sản</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="border rounded-lg bg-white transition-all duration-200"
                >
                  {/* Company Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        {editingCompany?.id === company.id ? (
                          <div className="flex gap-2 flex-1">
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
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{company.name}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-4">
                              <span>{company.assets_count || 0} tài sản</span>
                              <span>{company.permissions?.length || 0} người có quyền</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {editingCompany?.id !== company.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditCompany(company)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                          >
                            {expandedCompany === company.id ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {company.assets_count === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCompany(company)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Permissions Section */}
                  {expandedCompany === company.id && (
                    <div className="border-t bg-gray-50 p-4 space-y-4">
                      
                      {/* Current Permissions */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Phân quyền truy cập
                        </h4>

                        {/* Existing permissions */}
                        {company.permissions && company.permissions.length > 0 && (
                          <div className="space-y-2 mb-3">
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
                                    <div className="font-medium text-sm">{permission.member?.email || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">
                                      Cấp lúc: {new Date(permission.granted_at).toLocaleDateString('vi-VN')}
                                    </div>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleBadgeColor(permission.role)}`}>
                                    {permission.role === 'admin' ? 'Quản trị' :
                                     permission.role === 'member' ? 'Thành viên' : 'Xem'}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => revokePermission(permission.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add new permissions */}
                        {members.filter(member => 
                          member.role !== 'owner' && 
                          member.status === 'active' && 
                          !company.permissions?.some((p: any) => p.license_member_id === member.id)
                        ).length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 mb-2">Cấp quyền cho thành viên:</div>
                            {members
                              .filter(member => 
                                member.role !== 'owner' && 
                                member.status === 'active' && 
                                !company.permissions?.some((p: any) => p.license_member_id === member.id)
                              )
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
                                      <div className="font-medium text-sm">{member.email}</div>
                                      <div className="text-xs text-gray-500">Chưa có quyền</div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => grantPermission(company.id, member.id, 'viewer')}
                                      className="text-xs"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Xem
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => grantPermission(company.id, member.id, 'member')}
                                      className="text-xs"
                                    >
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Sửa
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => grantPermission(company.id, member.id, 'admin')}
                                      className="text-xs"
                                    >
                                      <Shield className="h-3 w-3 mr-1" />
                                      Admin
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 bg-white rounded-lg border">
                            <Check className="h-8 w-8 mx-auto mb-2 text-green-400" />
                            <p className="text-sm">
                              {members.filter(m => m.role !== 'owner').length === 0 
                                ? 'Chưa có thành viên nào để phân quyền'
                                : 'Tất cả thành viên đã được phân quyền'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>📋 Hướng dẫn:</strong></p>
            <p>• Mỗi công ty là một danh sách tài sản riêng biệt</p>
            <p>• Phân quyền: Admin (toàn quyền), Thành viên (xem/sửa), Xem (chỉ xem)</p>
            <p>• Gói {licenseInfo.license.plan_type} cho phép tối đa {licenseInfo.license.max_companies} công ty</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  function startEditCompany(company: Company) {
    setEditingCompany(company);
    setEditName(company.name);
  }
}

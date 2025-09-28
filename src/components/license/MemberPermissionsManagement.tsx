'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Shield,
  Building2,
  Settings,
  Eye,
  X,
  Plus,
  AlertCircle,
  Check,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type {
  LicenseMember,
  Company,
  CompanyPermission,
  LicenseUsageInfo,
  MemberAdditionRequest
} from '@/types/license';
import { SUBSCRIPTION_PLANS } from '@/types/license';

interface MemberPermissionsManagementProps {
  licenseInfo?: LicenseUsageInfo | null;
  companies?: Company[];
  onMemberChange?: () => void;
}

interface MemberWithPermissions extends LicenseMember {
  company_permissions?: (CompanyPermission & { company?: Company })[];
}

export default function MemberPermissionsManagement({
  licenseInfo,
  companies = [],
  onMemberChange
}: MemberPermissionsManagementProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberWithPermissions[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [selectedCompanyPermissions, setSelectedCompanyPermissions] = useState<{
    [companyId: string]: 'admin' | 'member' | 'viewer';
  }>({});

  // Check if current user is license owner
  const isLicenseOwner = licenseInfo?.license?.owner_email === user?.email;

  // Load members with their company permissions
  const loadMembers = async () => {
    if (!licenseInfo?.license?.id) return;

    setLoading(true);
    try {
      // Get license members
      const { data: memberData, error: memberError } = await supabase
        .from('license_members')
        .select('*')
        .eq('license_id', licenseInfo.license.id)
        .order('joined_at', { ascending: true });

      if (memberError) throw memberError;

      // Get company permissions for each member
      const membersWithPermissions: MemberWithPermissions[] = [];

      for (const member of memberData || []) {
        const { data: permissions, error: permError } = await supabase
          .from('company_permissions')
          .select(`
            *,
            company:companies(*)
          `)
          .eq('license_member_id', member.id);

        if (permError) throw permError;

        membersWithPermissions.push({
          ...member,
          company_permissions: permissions || []
        });
      }

      setMembers(membersWithPermissions);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [licenseInfo?.license?.id]);

  // Handle company permission selection for invitation
  const handleCompanyPermissionChange = (companyId: string, role: 'admin' | 'member' | 'viewer') => {
    setSelectedCompanyPermissions(prev => ({
      ...prev,
      [companyId]: role
    }));
  };

  // Remove company permission for invitation
  const removeCompanyPermission = (companyId: string) => {
    setSelectedCompanyPermissions(prev => {
      const newPerms = { ...prev };
      delete newPerms[companyId];
      return newPerms;
    });
  };

  // Invite new member with company permissions
  const inviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    if (!inviteEmail.includes('@')) {
      toast.error('Email không hợp lệ');
      return;
    }

    if (!licenseInfo?.license?.id) {
      toast.error('Không tìm thấy thông tin license');
      return;
    }

    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể mời thành viên');
      return;
    }

    // Check if email already exists
    if (members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast.error('Email này đã có trong team');
      return;
    }

    // Check license limits
    const planLimits = SUBSCRIPTION_PLANS[licenseInfo.license.plan_type];
    const maxMembers = planLimits?.max_members || 1;
    if (members.length >= maxMembers && maxMembers !== 999) {
      toast.error(`Gói ${licenseInfo.license.plan_type} chỉ cho phép tối đa ${maxMembers} thành viên`);
      return;
    }

    // Check if at least one company permission is selected
    if (Object.keys(selectedCompanyPermissions).length === 0) {
      toast.error('Vui lòng chọn ít nhất một công ty để cấp quyền');
      return;
    }

    setInviting(true);
    try {
      // Create license member
      const { data: memberData, error: memberError } = await supabase
        .from('license_members')
        .insert({
          license_id: licenseInfo.license.id,
          email: inviteEmail.trim(),
          role: 'member',
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Create company permissions
      const permissionInserts = Object.entries(selectedCompanyPermissions).map(([companyId, role]) => ({
        company_id: companyId,
        license_member_id: memberData.id,
        role,
        granted_by: user?.id,
        granted_at: new Date().toISOString()
      }));

      const { error: permError } = await supabase
        .from('company_permissions')
        .insert(permissionInserts);

      if (permError) throw permError;

      toast.success(`Đã mời ${inviteEmail} vào team với quyền truy cập ${Object.keys(selectedCompanyPermissions).length} công ty`);
      setInviteEmail('');
      setSelectedCompanyPermissions({});
      await loadMembers();
      onMemberChange?.();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error.message || 'Không thể mời thành viên');
    } finally {
      setInviting(false);
    }
  };

  // Remove member
  const removeMember = async (memberToRemove: MemberWithPermissions) => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể xóa thành viên');
      return;
    }

    if (memberToRemove.role === 'owner') {
      toast.error('Không thể xóa chủ sở hữu license');
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa ${memberToRemove.email} khỏi team? Tất cả quyền truy cập công ty sẽ bị thu hồi.`)) {
      try {
        // Delete company permissions first
        const { error: permError } = await supabase
          .from('company_permissions')
          .delete()
          .eq('license_member_id', memberToRemove.id);

        if (permError) throw permError;

        // Delete member
        const { error: memberError } = await supabase
          .from('license_members')
          .delete()
          .eq('id', memberToRemove.id);

        if (memberError) throw memberError;

        toast.success(`Đã xóa ${memberToRemove.email} khỏi team`);
        await loadMembers();
        onMemberChange?.();
      } catch (error: any) {
        console.error('Error removing member:', error);
        toast.error(error.message || 'Không thể xóa thành viên');
      }
    }
  };

  // Update member's company permission
  const updateCompanyPermission = async (
    memberId: string,
    companyId: string,
    newRole: 'admin' | 'member' | 'viewer'
  ) => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể thay đổi quyền');
      return;
    }

    try {
      const { error } = await supabase
        .from('company_permissions')
        .update({ role: newRole })
        .eq('license_member_id', memberId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Đã cập nhật quyền truy cập');
      await loadMembers();
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast.error(error.message || 'Không thể cập nhật quyền');
    }
  };

  // Remove company permission from member
  const removeCompanyPermissionFromMember = async (memberId: string, companyId: string) => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể thu hồi quyền');
      return;
    }

    try {
      const { error } = await supabase
        .from('company_permissions')
        .delete()
        .eq('license_member_id', memberId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Đã thu hồi quyền truy cập công ty');
      await loadMembers();
    } catch (error: any) {
      console.error('Error removing permission:', error);
      toast.error(error.message || 'Không thể thu hồi quyền');
    }
  };

  if (!licenseInfo?.license) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Bạn cần kích hoạt license để quản lý team</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Settings className="h-3 w-3" />;
      case 'member': return <Users className="h-3 w-3" />;
      case 'viewer': return <Eye className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'member': return 'bg-blue-100 text-blue-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Quản lý Team & Phân quyền
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal">
            {members.length}/{(() => {
              const planLimits = SUBSCRIPTION_PLANS[licenseInfo.license.plan_type];
              const maxMembers = planLimits?.max_members || 1;
              return maxMembers === 999 ? '∞' : maxMembers;
            })()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          {/* Invite Section - Only for owners */}
          {isLicenseOwner && companies.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Mời thành viên mới</span>
              </div>

              <div className="space-y-3">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Nhập email thành viên..."
                  className="w-full"
                />

                {/* Company Permissions Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Chọn công ty và phân quyền:
                  </label>

                  <div className="grid grid-cols-1 gap-2">
                    {companies.map((company) => (
                      <div key={company.id} className="flex items-center gap-2 p-2 bg-white border rounded">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="flex-1 text-sm">{company.name}</span>

                        {selectedCompanyPermissions[company.id] ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={selectedCompanyPermissions[company.id]}
                              onChange={(e) => handleCompanyPermissionChange(
                                company.id,
                                e.target.value as 'admin' | 'member' | 'viewer'
                              )}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCompanyPermission(company.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCompanyPermissionChange(company.id, 'member')}
                            className="h-6 text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Thêm
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={inviteMember}
                  disabled={inviting || !inviteEmail.trim() || Object.keys(selectedCompanyPermissions).length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {inviting ? (
                    <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Mời thành viên
                </Button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>Thành viên team ({members.length})</span>
              {loading && <Clock className="h-4 w-4 animate-pulse text-gray-400" />}
            </div>

            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Chưa có thành viên nào</p>
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className={`border rounded-lg transition-colors ${
                    member.role === 'owner'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Member Header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        member.role === 'owner' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {member.role === 'owner' ? (
                          <Crown className="h-5 w-5 text-green-600" />
                        ) : (
                          <Mail className="h-5 w-5 text-blue-600" />
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {member.email}
                          {member.email === user?.email && (
                            <span className="ml-2 text-xs text-gray-500">(Bạn)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{member.role === 'owner' ? 'Chủ sở hữu' : 'Thành viên'}</span>
                          <span>•</span>
                          <span>{member.company_permissions?.length || 0} công ty</span>
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      {member.company_permissions && member.company_permissions.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedMember(
                            expandedMember === member.id ? null : member.id
                          )}
                          className="text-gray-500"
                        >
                          {expandedMember === member.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      {/* Remove Button - Only for owners, can't remove themselves */}
                      {isLicenseOwner && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Company Permissions */}
                  {expandedMember === member.id && member.company_permissions && (
                    <div className="border-t bg-white p-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        Quyền truy cập công ty:
                      </div>

                      <div className="space-y-2">
                        {member.company_permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                          >
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span className="flex-1 text-sm">
                              {permission.company?.name || 'Unknown Company'}
                            </span>

                            {isLicenseOwner ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={permission.role}
                                  onChange={(e) => updateCompanyPermission(
                                    member.id,
                                    permission.company_id,
                                    e.target.value as 'admin' | 'member' | 'viewer'
                                  )}
                                  className="text-xs border rounded px-2 py-1"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeCompanyPermissionFromMember(
                                    member.id,
                                    permission.company_id
                                  )}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${getRoleColor(permission.role)}`}>
                                {getRoleIcon(permission.role)}
                                {permission.role}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>👥 Quy định phân quyền:</strong></p>
            <p>• <strong>Admin:</strong> Toàn quyền quản lý công ty</p>
            <p>• <strong>Member:</strong> Thêm/sửa tài sản, không thể xóa</p>
            <p>• <strong>Viewer:</strong> Chỉ xem, không thể chỉnh sửa</p>
            <p>• Chủ sở hữu license có thể mời/xóa thành viên và phân quyền</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
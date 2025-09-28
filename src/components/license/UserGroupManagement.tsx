'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  Plus,
  Copy,
  Trash2,
  Send,
  Crown,
  Shield,
  AlertCircle,
  Clock,
  Check,
  ExternalLink,
  UserPlus,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { LicenseMember, LicenseUsageInfo } from '@/types/license';

interface UserGroupManagementProps {
  licenseInfo?: LicenseUsageInfo | null;
  onMemberChange?: () => void;
}

export default function UserGroupManagement({ licenseInfo, onMemberChange }: UserGroupManagementProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<LicenseMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  // Check if user is license owner
  const isLicenseOwner = licenseInfo?.license?.owner_email === user?.email;

  // Load license members
  const loadMembers = async () => {
    if (!licenseInfo?.license?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('license_members')
        .select('*')
        .eq('license_id', licenseInfo.license.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
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

  // Generate invite link
  const generateInviteLink = () => {
    if (!licenseInfo?.license?.id) return;

    const baseUrl = window.location.origin;
    const inviteToken = btoa(`${licenseInfo.license.id}:${Date.now()}`);
    const link = `${baseUrl}/invite/${inviteToken}`;
    setInviteLink(link);
  };

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    if (!inviteLink) {
      generateInviteLink();
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Đã copy link mời vào clipboard');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Đã copy link mời vào clipboard');
    }
  };

  // Invite member by email
  const inviteMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
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
    const existingMember = members.find(m => m.email.toLowerCase() === newMemberEmail.toLowerCase());
    if (existingMember) {
      toast.error('Email này đã được thêm vào license');
      return;
    }

    // Check member limits
    if (members.length >= licenseInfo.license.max_members && licenseInfo.license.max_members !== 999) {
      toast.error(`License chỉ cho phép tối đa ${licenseInfo.license.max_members} thành viên`);
      return;
    }

    setInviting(true);
    try {
      const { data, error } = await supabase
        .from('license_members')
        .insert({
          license_id: licenseInfo.license.id,
          email: newMemberEmail.toLowerCase(),
          role: 'member',
          status: 'pending',
          invited_by: user?.email,
          invited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Đã gửi lời mời đến ${newMemberEmail}`);
      setNewMemberEmail('');
      await loadMembers();
      onMemberChange?.();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error.message || 'Không thể gửi lời mời');
    } finally {
      setInviting(false);
    }
  };

  // Remove member
  const removeMember = async (member: LicenseMember) => {
    if (!isLicenseOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể xóa thành viên');
      return;
    }

    if (member.role === 'owner') {
      toast.error('Không thể xóa chủ sở hữu license');
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa ${member.email} khỏi license?`)) {
      try {
        const { error } = await supabase
          .from('license_members')
          .delete()
          .eq('id', member.id);

        if (error) throw error;

        toast.success(`Đã xóa ${member.email} khỏi license`);
        await loadMembers();
        onMemberChange?.();
      } catch (error: any) {
        console.error('Error removing member:', error);
        toast.error(error.message || 'Không thể xóa thành viên');
      }
    }
  };

  if (!licenseInfo?.license) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Bạn cần kích hoạt license để quản lý nhóm người dùng</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Quản lý Nhóm Người Dùng
          <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-normal">
            {members.length}/{licenseInfo.license.max_members === 999 ? '∞' : licenseInfo.license.max_members}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          {/* Invite Section - Only for license owners */}
          {isLicenseOwner && (
            <div className="space-y-4">
              {/* Email Invitation */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Mời thành viên qua email</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Nhập email thành viên..."
                    type="email"
                    onKeyPress={(e) => e.key === 'Enter' && inviteMember()}
                    className="flex-1"
                  />
                  <Button
                    onClick={inviteMember}
                    disabled={inviting || !newMemberEmail.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {inviting ? (
                      <Clock className="h-4 w-4 mr-1 animate-pulse" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Mời
                  </Button>
                </div>
              </div>

              {/* Invite Link */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <LinkIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Link mời nhanh</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    placeholder="Nhấn 'Tạo link' để tạo link mời"
                    readOnly
                    className="flex-1 bg-white"
                  />
                  {!inviteLink ? (
                    <Button
                      onClick={generateInviteLink}
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Tạo link
                    </Button>
                  ) : (
                    <Button
                      onClick={copyInviteLink}
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Chia sẻ link này để mời người khác tham gia license của bạn
                </p>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>Danh sách thành viên ({members.length})</span>
              {loading && <Clock className="h-4 w-4 animate-pulse text-gray-400" />}
            </div>

            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Chưa có thành viên nào</p>
                {isLicenseOwner && (
                  <p className="text-sm mt-2">Mời thành viên đầu tiên để bắt đầu</p>
                )}
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 border rounded-lg bg-gray-50 border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Member Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.role === 'owner' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      {member.role === 'owner' ? (
                        <Crown className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <Users className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    {/* Member Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{member.email}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          member.role === 'owner'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {member.role === 'owner' ? 'Chủ sở hữu' : 'Thành viên'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          member.status === 'active'
                            ? 'bg-blue-100 text-blue-700'
                            : member.status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.status === 'active' ? 'Hoạt động' :
                           member.status === 'pending' ? 'Chờ xác nhận' : 'Không hoạt động'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {member.joined_at ? (
                          `Tham gia: ${new Date(member.joined_at).toLocaleDateString('vi-VN')}`
                        ) : (
                          `Được mời: ${new Date(member.invited_at).toLocaleDateString('vi-VN')}`
                        )}
                        {member.invited_by && (
                          <span className="ml-2">• Được mời bởi: {member.invited_by}</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Only for license owners */}
                    {isLicenseOwner && member.role !== 'owner' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Usage Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>👥 Thông tin nhóm người dùng:</strong></p>
            <p>• Chủ sở hữu license có thể mời/xóa thành viên</p>
            <p>• Thành viên có thể truy cập các công ty được phân quyền</p>
            <p>• Gói {licenseInfo.license.plan_type} cho phép tối đa {
              licenseInfo.license.max_members === 999 ? 'không giới hạn' : licenseInfo.license.max_members
            } thành viên</p>
            <p>• Sử dụng email hoặc link mời để thêm thành viên mới</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
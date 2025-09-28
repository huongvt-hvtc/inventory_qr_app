'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Shield,
  X,
  Plus,
  AlertCircle,
  Check,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLicense } from '@/hooks/useLicense';
import toast from 'react-hot-toast';
import type { LicenseMember } from '@/types/license';

export default function LicenseTeamManagement() {
  const { user } = useAuth();
  const { licenseInfo } = useLicense();
  const [members, setMembers] = useState<LicenseMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Check if current user is owner
  const isOwner = members.find(m => m.email === user?.email && m.role === 'owner');
  const currentUserMember = members.find(m => m.email === user?.email);

  // Load team members
  const loadMembers = async () => {
    if (!licenseInfo?.license?.key_code) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('license_members')
        .select('*')
        .eq('license_key_id', licenseInfo.license.key_code)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [licenseInfo?.license?.key_code]);

  // Invite new member
  const inviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    if (!inviteEmail.includes('@')) {
      toast.error('Email không hợp lệ');
      return;
    }

    if (!licenseInfo?.license?.key_code) {
      toast.error('Không tìm thấy thông tin license');
      return;
    }

    if (!isOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể mời thành viên');
      return;
    }

    // Check if email already exists
    if (members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast.error('Email này đã có trong team');
      return;
    }

    // Check license limits
    const maxEmails = licenseInfo.license.max_emails || 1;
    if (members.length >= maxEmails && maxEmails !== 999) {
      toast.error(`Gói license chỉ cho phép tối đa ${maxEmails} thành viên`);
      return;
    }

    setInviting(true);
    try {
      const { error } = await supabase
        .from('license_members')
        .insert({
          license_key_id: licenseInfo.license.key_code,
          email: inviteEmail.trim(),
          role: 'member',
          status: 'active',
          invited_by: user?.id,
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`Đã mời ${inviteEmail} vào team`);
      setInviteEmail('');
      await loadMembers();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error.message || 'Không thể mời thành viên');
    } finally {
      setInviting(false);
    }
  };

  // Remove member
  const removeMember = async (memberToRemove: LicenseMember) => {
    if (!isOwner) {
      toast.error('Chỉ chủ sở hữu license mới có thể xóa thành viên');
      return;
    }

    if (memberToRemove.role === 'owner') {
      toast.error('Không thể xóa chủ sở hữu license');
      return;
    }

    if (confirm(`Bạn có chắc muốn xóa ${memberToRemove.email} khỏi team?`)) {
      try {
        const { error } = await supabase
          .from('license_members')
          .delete()
          .eq('id', memberToRemove.id);

        if (error) throw error;

        toast.success(`Đã xóa ${memberToRemove.email} khỏi team`);
        await loadMembers();
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
            <p>Bạn cần kích hoạt license để quản lý team</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Quản lý Team
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal">
            {members.length}/{licenseInfo.license.max_emails === 999 ? '∞' : licenseInfo.license.max_emails}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">

          {/* Invite Section - Only for owners */}
          {isOwner && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Mời thành viên mới</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Nhập email thành viên..."
                  onKeyPress={(e) => e.key === 'Enter' && inviteMember()}
                  className="flex-1"
                />
                <Button
                  onClick={inviteMember}
                  disabled={inviting || !inviteEmail.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {inviting ? (
                    <Clock className="h-4 w-4 mr-1 animate-pulse" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Mời
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
                  className={`p-4 border rounded-lg transition-colors ${
                    member.role === 'owner'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.role === 'owner'
                        ? 'bg-green-100'
                        : 'bg-blue-100'
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
                        <span className={`flex items-center gap-1 ${
                          member.status === 'active' ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          <Check className="h-3 w-3" />
                          {member.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                        </span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className={`px-2 py-1 text-xs font-medium rounded ${
                      member.role === 'owner'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {member.role === 'owner' ? (
                        <div className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Owner
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Member
                        </div>
                      )}
                    </div>

                    {/* Remove Button - Only for owners, can't remove themselves */}
                    {isOwner && member.role !== 'owner' && (
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
              ))
            )}
          </div>

          {/* Team Info */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>📋 Quy định team:</strong></p>
            <p>• Chủ sở hữu có thể mời/xóa thành viên</p>
            <p>• Tất cả thành viên có thể sử dụng đầy đủ tính năng</p>
            <p>• Gói {licenseInfo.license.plan_type} cho phép tối đa {licenseInfo.license.max_emails === 999 ? 'không giới hạn' : licenseInfo.license.max_emails} thành viên</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
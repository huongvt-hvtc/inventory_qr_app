'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Crown,
  AlertCircle,
  Clock,
  UserPlus
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
  const [adding, setAdding] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

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


  // Add member directly by email
  const addMember = async () => {
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
      toast.error('Chỉ chủ sở hữu license mới có thể thêm thành viên');
      return;
    }

    // Check if email already exists
    const existingMember = members.find(m => m.email.toLowerCase() === newMemberEmail.toLowerCase());
    if (existingMember) {
      toast.error('Email này đã có trong license');
      return;
    }

    // Check member limits
    if (members.length >= licenseInfo.license.max_members && licenseInfo.license.max_members !== 999) {
      toast.error(`License chỉ cho phép tối đa ${licenseInfo.license.max_members} thành viên`);
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('license_members')
        .insert({
          license_id: licenseInfo.license.id,
          email: newMemberEmail.toLowerCase(),
          role: 'member',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Đã thêm ${newMemberEmail} vào license`);

      setNewMemberEmail('');
      await loadMembers();
      onMemberChange?.();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Không thể thêm thành viên');
    } finally {
      setAdding(false);
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

          {/* Add Member Section - Only for license owners */}
          {isLicenseOwner && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Thêm thành viên vào nhóm</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Nhập email thành viên..."
                  type="email"
                  onKeyPress={(e) => e.key === 'Enter' && addMember()}
                  className="flex-1"
                />
                <Button
                  onClick={addMember}
                  disabled={adding || !newMemberEmail.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {adding ? (
                    <Clock className="h-4 w-4 mr-1 animate-pulse" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Thêm
                </Button>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Thành viên sẽ được truy cập ngay khi đăng nhập bằng email này
              </p>
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
                  <p className="text-sm mt-2">Thêm thành viên đầu tiên để bắt đầu</p>
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
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                          Hoạt động
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {member.joined_at && `Tham gia: ${new Date(member.joined_at).toLocaleDateString('vi-VN')}`}
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
            <p>• Chủ sở hữu license có thể thêm/xóa thành viên</p>
            <p>• Thành viên có thể truy cập các công ty được phân quyền</p>
            <p>• Gói {licenseInfo.license.plan_type} cho phép tối đa {
              licenseInfo.license.max_members === 999 ? 'không giới hạn' : licenseInfo.license.max_members
            } thành viên</p>
            <p>• Thành viên đăng nhập bằng email được thêm sẽ tự động có quyền truy cập</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
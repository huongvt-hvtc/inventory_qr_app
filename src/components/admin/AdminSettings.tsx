'use client';

import React, { useState } from 'react';
import {
  User,
  LogOut,
  Shield,
  Settings,
  Database,
  Wifi,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabasePing } from '@/lib/supabase-ping';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const { user, signOut } = useAuth();
  const [pinging, setPinging] = useState(false);

  const handleManualPing = async () => {
    setPinging(true);
    try {
      const success = await supabasePing.manualPing();
      if (success) {
        toast.success('✅ Supabase ping thành công!');
      } else {
        toast.error('❌ Supabase ping thất bại');
      }
    } catch (error) {
      toast.error('❌ Lỗi khi ping Supabase');
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thiết lập Admin</h1>
        <p className="text-gray-600">Quản lý tài khoản và cài đặt hệ thống</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Account Information */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-orange-600" />
                Thông tin tài khoản Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-16 w-16 rounded-full ring-4 ring-white shadow-md"
                  />
                ) : (
                  <User className="h-16 w-16 rounded-full bg-gray-200 p-3 text-gray-600 ring-4 ring-white shadow-md" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {user.name}
                  </h3>
                  <p className="text-gray-600 break-words">
                    {user.email}
                  </p>
                  <div className="mt-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={signOut}
                  variant="outline"
                  className="w-full md:w-auto bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 font-semibold"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất khỏi Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supabase Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-blue-600" />
              Quản lý Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Wifi className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">Auto-ping Supabase</h4>
                    <p className="text-sm text-blue-700">
                      Hệ thống tự động ping Supabase mỗi 6 ngày để tránh project bị pause do không hoạt động.
                      Đảm bảo database luôn sẵn sàng phục vụ người dùng.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Ping lần cuối</div>
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const pingInfo = supabasePing.getLastPingInfo();
                        if (!pingInfo.lastPing) {
                          return 'Chưa có ping nào';
                        }
                        const date = new Date(pingInfo.lastPing);
                        return `${date.toLocaleDateString('vi-VN')} - ${pingInfo.daysSinceLastPing} ngày trước`;
                      })()}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleManualPing}
                  disabled={pinging}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {pinging ? (
                    <>
                      <Wifi className="h-4 w-4 mr-2 animate-pulse" />
                      Đang ping...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Ping ngay
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>💡 <strong>Auto-ping giúp gì?</strong></p>
                <p>• Ngăn Supabase pause project sau 7 ngày không hoạt động</p>
                <p>• Đảm bảo app luôn sẵn sàng sử dụng cho toàn bộ hệ thống</p>
                <p>• Không ảnh hưởng đến hiệu suất và bảo mật</p>
                <p>• Duy trì tính ổn định cho tất cả license keys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-gray-600" />
              Thông tin hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Version</div>
                <div className="text-gray-600">Admin Panel v1.0.0</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Environment</div>
                <div className="text-gray-600">Production</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Database</div>
                <div className="text-gray-600">Supabase PostgreSQL</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Last Update</div>
                <div className="text-gray-600">{new Date().toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
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
import LicenseActivation from '@/components/license/LicenseActivation';
import LicenseUsageDisplay from '@/components/license/LicenseUsageDisplay';

export default function SettingsPage() {
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 relative z-30">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-600" />
            Thiết lập
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6" data-scroll="true">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* License Management Section */}
          <div className="space-y-6">
            <LicenseUsageDisplay />
            <LicenseActivation />
          </div>

          {/* Account Information */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-orange-600" />
                  Thông tin tài khoản
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
                    <div className="mt-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <Shield className="h-3 w-3 mr-1" />
                      Đã xác thực
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
                    Đăng xuất
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
                Quản lý Supabase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Wifi className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">Auto-ping hoạt động</h4>
                      <p className="text-sm text-blue-700">
                        Hệ thống tự động ping Supabase mỗi 6 ngày để tránh project bị pause do không hoạt động.
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
                  <p>• Đảm bảo app luôn sẵn sàng sử dụng</p>
                  <p>• Không ảnh hưởng đến hiệu suất</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
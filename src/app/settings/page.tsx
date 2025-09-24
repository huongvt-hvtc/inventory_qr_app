'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  LogOut,
  Settings as SettingsIcon,
  Mail,
  Shield,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Modern Header - Consistent with Assets */}
        <div className="fixed top-0 left-0 md:left-64 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="px-4 md:px-6 py-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <SettingsIcon className="h-6 w-6 md:h-7 md:w-7 text-orange-600" />
                Cài đặt Hệ thống
              </h1>

              {/* Quick Navigation - Disabled when not logged in */}
              <div className="flex items-center gap-3 md:gap-4 text-sm opacity-50">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg font-medium">
                  <User className="h-3.5 w-3.5" />
                  <span>Tài khoản</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg font-medium">
                  <Info className="h-3.5 w-3.5" />
                  <span>App Info</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg font-medium">
                  <SettingsIcon className="h-3.5 w-3.5" />
                  <span>Tips</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-24 md:pt-28 px-2 md:px-6 pb-20 md:pb-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-8 text-center">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Chưa đăng nhập
              </h2>
              <p className="text-gray-600">
                Vui lòng đăng nhập để truy cập cài đặt
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Modern Header - Consistent with Assets */}
      <div className="fixed top-0 left-0 md:left-64 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="px-4 md:px-6 py-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 md:h-7 md:w-7 text-orange-600" />
              Cài đặt Hệ thống
            </h1>

            {/* Quick Navigation - Like Instructions */}
            <div className="flex items-center gap-3 md:gap-4 text-sm">
              <a
                href="#user-profile"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition-colors duration-200"
              >
                <User className="h-3.5 w-3.5" />
                <span>Tài khoản</span>
              </a>
              <a
                href="#app-info"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg font-medium hover:bg-green-200 transition-colors duration-200"
              >
                <Info className="h-3.5 w-3.5" />
                <span>App Info</span>
              </a>
              <a
                href="#tips"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg font-medium hover:bg-purple-200 transition-colors duration-200"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                <span>Tips</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-24 md:pt-28 px-2 md:px-6 pb-20 md:pb-6">
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden scroll-mt-24" id="user-profile">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Thông tin tài khoản
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-16 w-16 rounded-full ring-4 ring-white shadow-md"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center ring-4 ring-white shadow-md">
                    <User className="h-8 w-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {user.name}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 mt-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Vai trò: {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={signOut}
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 h-12 font-semibold"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Đăng xuất khỏi tài khoản
              </Button>
            </div>
          </div>

          {/* App Information Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden scroll-mt-24" id="app-info">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Info className="h-5 w-5 text-green-600" />
                Thông tin ứng dụng
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Tên ứng dụng:</span>
                    <span className="font-semibold text-gray-900">Kiểm kê tài sản</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Phiên bản:</span>
                    <span className="font-semibold text-gray-900">1.0.0</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Loại ứng dụng:</span>
                    <span className="font-semibold text-gray-900">PWA</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Cập nhật:</span>
                    <span className="font-semibold text-gray-900">{new Date().toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Help Card */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl shadow-lg p-6 scroll-mt-24" id="tips">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-purple-600" />
              💡 Gợi ý sử dụng
            </h2>
            <div className="text-sm text-gray-700 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Để có trải nghiệm tốt nhất, hãy cài đặt ứng dụng PWA từ tab <strong>Hướng dẫn</strong></p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Sử dụng tab <strong>Quét QR</strong> để quét mã QR nhanh chóng</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Xuất dữ liệu Excel định kỳ từ tab <strong>Tài sản</strong> để sao lưu</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
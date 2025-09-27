'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import LoginPage from '@/components/auth/LoginPage';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import {
  Shield,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children?: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const loading = authLoading || adminLoading;

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('🔄 AdminLayout: Loading state - Auth:', authLoading, 'Admin:', adminLoading, 'User:', user?.email);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-blue-600 p-3 rounded-2xl mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <Shield className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Đang kiểm tra quyền truy cập...
          </h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-xs text-gray-500 mt-4">
            Auth: {authLoading ? '⏳' : '✅'} | Admin: {adminLoading ? '⏳' : '✅'} | User: {user?.email || 'None'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Nếu màn hình này hiện quá lâu, vui lòng kiểm tra console hoặc tải lại trang
          </p>
        </div>
      </div>
    );
  }

  // Force login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            {/* App Branding */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-3xl shadow-lg">
                  <Shield className="h-10 w-10 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">
                Inventory QR
              </h1>
            </div>

            {/* Admin Login Section */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Admin Dashboard
                </h2>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed text-center">
                Đăng nhập để truy cập trang quản trị
              </p>
            </div>

            <LoginPage />
          </div>
        </div>
      </div>
    );
  }

  // Check admin access
  if (!isAdmin) {
    console.log('❌ AdminLayout: User is not admin - Email:', user?.email, 'IsAdmin:', isAdmin);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-gray-600 mb-4">
            Bạn không có quyền truy cập trang quản trị này.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Email hiện tại: {user?.email || 'Không có'}
          </p>
          <Button onClick={signOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Admin Navigation */}
      <AdminNavigation activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
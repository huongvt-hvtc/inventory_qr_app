'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import LoginPage from '@/components/auth/LoginPage';
import {
  Shield,
  LogOut,
  User,
  Building,
  Key,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdminAccess();

  // Show loading spinner while checking authentication
  if (loading) {
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
            Nếu màn hình này hiện quá lâu, vui lòng kiểm tra console hoặc tải lại trang
          </p>
        </div>
      </div>
    );
  }

  // Force login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-600 p-3 rounded-2xl">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-gray-600 mb-6">
            Bạn không có quyền truy cập trang quản trị này.
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
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Quản lý subscription & người dùng
                </p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5 text-gray-600" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user.name}
                </span>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Đăng xuất</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-4">
          <div className="flex space-x-8">
            <a
              href="#licenses"
              className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
            >
              <Key className="h-4 w-4 inline mr-2" />
              License Keys
            </a>
            <a
              href="#companies"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              <Building className="h-4 w-4 inline mr-2" />
              Công ty
            </a>
            <a
              href="#users"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              <Users className="h-4 w-4 inline mr-2" />
              Người dùng
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import LoginPage from '@/components/auth/LoginPage';
import {
  Shield,
  LogOut,
  User,
  Key,
  BookOpen,
  Menu,
  X
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loading = authLoading || adminLoading;

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Shield },
    { id: 'licenses', name: 'Licenses', icon: Key },
    { id: 'guide', name: 'Hướng dẫn', icon: BookOpen },
  ];

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
      {/* Admin Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* App Branding & Admin Title */}
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Inventory QR
                </h1>
                <p className="text-sm text-gray-600">
                  Admin Dashboard
                </p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white rounded-xl border shadow-sm">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-8 w-8 rounded-full border-2 border-blue-100"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user.email}
                  </p>
                </div>
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
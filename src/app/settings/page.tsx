'use client';

import React from 'react';
import {
  User,
  LogOut,
  Shield,
  Building2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NewLicenseDisplay from '@/components/license/NewLicenseDisplay';
import UnifiedCompanyManagement from '@/components/license/UnifiedCompanyManagement';
import UserGroupManagement from '@/components/license/UserGroupManagement';
import { useEmailLicense } from '@/hooks/useEmailLicense';
import PageHeader from '@/components/layout/PageHeader';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { licenseInfo, loadLicenseInfo } = useEmailLicense();

  // Check if user is license owner
  const isLicenseOwner = licenseInfo?.license?.owner_email === user?.email;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 space-y-6">
        <PageHeader
          title="Thiết lập"
          description="Quản lý license, nhóm người dùng và danh sách tài sản cho tài khoản của bạn"
          showCompanySwitcher={false}
        />

        {/* Account Information */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-orange-600" />
                Thông tin tài khoản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="h-20 w-20 rounded-full ring-4 ring-white shadow-lg"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center ring-4 ring-white shadow-lg">
                      <span className="text-white text-2xl font-bold">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {user.name}
                  </h3>
                  <p className="text-gray-600 break-words">
                    {user.email}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <Shield className="h-3 w-3 mr-1" />
                      Đã xác thực Google
                    </span>
                    {isLicenseOwner && (
                      <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        <Building2 className="h-3 w-3 mr-1" />
                        Chủ sở hữu license
                      </span>
                    )}
                  </div>
                </div>

                {/* Sign Out Button */}
                <div className="flex-shrink-0">
                  <Button
                    onClick={signOut}
                    variant="outline"
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 font-semibold"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Đăng xuất
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              {licenseInfo && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {licenseInfo.license?.plan_type?.toUpperCase() || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600">Gói dịch vụ</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {licenseInfo.companies?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Danh sách tài sản</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">
                      {licenseInfo.members?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Thành viên</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border">
                    <div className="text-2xl font-bold text-orange-600">
                      {(() => {
                        if (!licenseInfo.license?.valid_until) return 0;
                        const days = Math.ceil((new Date(licenseInfo.license.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return days > 0 ? days : 0;
                      })()}
                    </div>
                    <div className="text-xs text-gray-600">Ngày còn lại</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* License Information - For all users */}
        <NewLicenseDisplay />

        {/* License Management - Only for license owners */}
        {isLicenseOwner && licenseInfo && (
          <div className="space-y-6">
            <UserGroupManagement
              licenseInfo={licenseInfo}
              onMemberChange={loadLicenseInfo}
            />

            <UnifiedCompanyManagement
              licenseInfo={licenseInfo}
              onDataChange={loadLicenseInfo}
            />
          </div>
        )}

        {/* For non-owners, show company access */}
        {!isLicenseOwner && licenseInfo?.companies && licenseInfo.companies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
                Công ty bạn có quyền truy cập
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {licenseInfo.companies.map((company) => (
                  <div key={company.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-600">
                          Tạo lúc: {new Date(company.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Thành viên
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

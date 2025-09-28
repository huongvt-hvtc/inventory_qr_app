'use client';

import React, { useState } from 'react';
import {
  User,
  LogOut,
  Shield,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LicenseActivation from '@/components/license/LicenseActivation';
import LicenseUsageDisplay from '@/components/license/LicenseUsageDisplay';

export default function SettingsPage() {
  const { user, signOut } = useAuth();

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
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-32 md:pb-6" data-scroll="true">
        <div className="max-w-2xl mx-auto space-y-6">

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

          {/* License Management Section */}
          <div className="space-y-6">
            <LicenseUsageDisplay />
            <LicenseActivation />
          </div>

        </div>
      </div>
    </div>
  );
}
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from './LoginPage';
import { Loader2, Package } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Package className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium text-gray-900">
                Đang tải ứng dụng...
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Vui lòng chờ trong giây lát
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
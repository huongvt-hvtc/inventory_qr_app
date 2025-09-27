'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from './LoginPage';
import { Loader2, Package, RefreshCw, AlertCircle } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [showReloadOption, setShowReloadOption] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  // Track loading time and show reload option after 10 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (loading) {
      setLoadingTime(0);
      setShowReloadOption(false);

      interval = setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;

          // Show reload option after 10 seconds
          if (newTime >= 10) {
            setShowReloadOption(true);
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [loading]);

  const handleReload = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Package className="h-12 w-12 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium text-gray-900">
                Đang tải ứng dụng...
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Vui lòng chờ trong giây lát ({loadingTime}s)
            </p>
          </div>

          {/* Show reload option after 10 seconds */}
          {showReloadOption && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Ứng dụng đang tải lâu</span>
              </div>

              <div className="text-sm text-amber-700 space-y-2">
                <p>Nếu app vẫn không tải được sau một lúc, bạn có thể:</p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>Nhấn nút "Tải lại" bên dưới</li>
                  <li>Hoặc thoát app hoàn toàn và mở lại</li>
                  <li>Kiểm tra kết nối mạng</li>
                </ul>
              </div>

              <button
                onClick={handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <RefreshCw className="h-4 w-4" />
                Tải lại ứng dụng
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // TEMPORARY: Skip authentication for local testing
  // TODO: Re-enable authentication later
  // if (!user) {
  //   return <LoginPage />;
  // }

  return <>{children}</>;
}
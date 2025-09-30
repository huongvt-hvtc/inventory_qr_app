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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  // Track loading time and show advanced options after 5 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (loading) {
      setLoadingTime(0);
      setShowAdvancedOptions(false);

      interval = setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;

          // Show advanced options after 5 seconds
          if (newTime >= 5) {
            setShowAdvancedOptions(true);
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
              {loadingTime < 5
                ? "Vui lòng chờ trong giây lát..."
                : `Đang tải... (${loadingTime}s)`
              }
            </p>
          </div>

          {/* Always show reload button and instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-center gap-2 text-blue-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Gặp vấn đề tải app?</span>
            </div>

            <div className="text-sm text-blue-700 space-y-2">
              <p>Nếu app không tải được, bạn có thể thử:</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>Nhấn "Tải lại app" bên dưới</li>
                <li>Thoát app hoàn toàn và mở lại</li>
                <li>Kiểm tra kết nối mạng</li>
                <li>Xóa cache trình duyệt (nếu cần)</li>
              </ul>
            </div>

            <button
              onClick={handleReload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại app
            </button>
          </div>

          {/* Show additional troubleshooting after 5 seconds */}
          {showAdvancedOptions && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Vẫn chưa tải được?</span>
              </div>

              <div className="text-sm text-amber-700 space-y-2">
                <p><strong>Cách khắc phục cho PWA:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-left">
                  <li>Đóng app hoàn toàn (swipe up và đóng)</li>
                  <li>Mở lại app từ home screen</li>
                  <li>Nếu vẫn lỗi, xóa app và cài lại từ browser</li>
                </ol>

                <p className="mt-3 text-xs text-amber-600">
                  💡 <strong>Lý do:</strong> PWA session có thể bị expired sau thời gian dài không sử dụng
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Require authentication to access protected pages
  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
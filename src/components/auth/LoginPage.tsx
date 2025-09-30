'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Mail, Shield, QrCode, Info, X, Smartphone, Monitor, Download } from 'lucide-react';
import { usePWAInstall } from '@/contexts/PWAInstallContext';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();
  const { installApp, canInstall, isIOS, isStandalone } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const handleInstallFromGuide = async () => {
    const result = await installApp();
    if (result === "accepted") {
      setShowInstallGuide(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Package className="h-12 w-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Asset Inventory QR
            </h1>
            <p className="text-gray-600 mt-2">
              Quản lý tài sản thông minh với mã QR
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-900">
              Đăng nhập để tiếp tục
            </CardTitle>
            <p className="text-sm text-gray-600">
              Sử dụng tài khoản Google để truy cập hệ thống
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Sign In Button */}
            <Button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full h-12 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  Đang đăng nhập...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Đăng nhập với Google
                </div>
              )}
            </Button>

            {(!isStandalone && (canInstall || isIOS)) && (
              <Button
                onClick={handleInstallFromGuide}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Cài đặt ứng dụng
              </Button>
            )}

            {/* Install Guide Button */}
            <Button
              onClick={() => setShowInstallGuide(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Info className="h-4 w-4 mr-2" />
              Hướng dẫn cài đặt PWA
            </Button>

            {/* Features List */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-medium text-gray-900 text-center">
                Tính năng chính
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <QrCode className="h-4 w-4 text-blue-600" />
                  Quét và tạo mã QR cho tài sản
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Package className="h-4 w-4 text-green-600" />
                  Quản lý danh sách tài sản
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-purple-600" />
                  Kiểm kê và theo dõi tài sản
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-orange-600" />
                  Xuất/nhập dữ liệu Excel
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Hướng dẫn cài đặt PWA
                </h3>
                <div className="flex items-center gap-2">
                  {(!isStandalone && (canInstall || isIOS)) && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleInstallFromGuide}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Cài đặt ngay
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInstallGuide(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobile Installation */}
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-green-600" />
                      Cài đặt trên Mobile
                    </h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div>
                        <div className="font-medium text-gray-800">📱 iOS (Safari):</div>
                        <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                          <li>Mở Safari</li>
                          <li>Nhấn nút Chia sẻ</li>
                          <li>Chọn "Add to Home Screen"</li>
                          <li>Nhấn "Add"</li>
                        </ol>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">🤖 Android (Chrome):</div>
                        <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                          <li>Mở Chrome</li>
                          <li>Nhấn menu (3 chấm)</li>
                          <li>Chọn "Add to Home screen"</li>
                          <li>Nhấn "Add"</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Desktop Installation */}
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-purple-600" />
                      Cài đặt trên Desktop
                    </h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div>
                        <div className="font-medium text-gray-800">💻 Chrome/Edge:</div>
                        <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                          <li>Tìm icon "Install" trên address bar</li>
                          <li>Hoặc nhấn menu → "Install Kiểm kê tài sản"</li>
                          <li>Nhấn "Install"</li>
                        </ol>
                      </div>
                      <div className="bg-purple-50 p-3 rounded mt-3">
                        <div className="text-xs text-purple-800 font-medium">✨ Lợi ích PWA:</div>
                        <ul className="text-xs text-purple-700 mt-1 space-y-1">
                          <li>• Hoạt động offline</li>
                          <li>• Tốc độ nhanh hơn</li>
                          <li>• Giao diện như app native</li>
                          <li>• Không cần App Store</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
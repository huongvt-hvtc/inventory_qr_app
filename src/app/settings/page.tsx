'use client';

import React, { useState } from 'react';
import {
  User,
  LogOut,
  Info,
  Smartphone,
  Monitor,
  Shield,
  HelpCircle,
  Mail,
  Package,
  X,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 relative z-30">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-green-600" />
            Cài đặt
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-40 md:pb-6" data-scroll="true">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Account Information */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-green-600" />
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

          {/* PWA Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-purple-600" />
                Ứng dụng PWA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Cài đặt Kiểm kê tài sản như một ứng dụng trên thiết bị của bạn để có trải nghiệm tốt nhất.
                </p>

                <Button
                  onClick={() => setShowInstallGuide(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Xem hướng dẫn cài đặt
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">Lợi ích PWA</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Hoạt động offline</li>
                      <li>• Tốc độ nhanh hơn</li>
                      <li>• Giao diện như app native</li>
                      <li>• Không cần App Store</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Hỗ trợ thiết bị</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• iOS Safari</li>
                      <li>• Android Chrome</li>
                      <li>• Windows Chrome/Edge</li>
                      <li>• macOS Safari/Chrome</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                Về ứng dụng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Kiểm kê tài sản</h3>
                    <p className="text-sm text-gray-600">Hệ thống quản lý tài sản với mã QR</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tính năng chính:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Quản lý danh sách tài sản</li>
                      <li>• Quét mã QR kiểm kê</li>
                      <li>• Import/Export Excel</li>
                      <li>• In mã QR hàng loạt</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Hỗ trợ:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Responsive design</li>
                      <li>• Offline capable</li>
                      <li>• Multi-platform PWA</li>
                      <li>• Real-time sync</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="font-medium">Nhà sáng lập:</span> ngoctmn
                      </p>
                      <p className="flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        <span className="font-medium">Phiên bản:</span> 1.0.0
                      </p>
                    </div>
                    <div className="text-right md:text-left">
                      <p className="text-gray-400">
                        © 2024 Kiểm kê tài sản
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Hướng dẫn cài đặt PWA
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallGuide(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
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
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Info,
  Smartphone,
  Monitor,
  Camera,
  ScanLine,
  CheckCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react';

export default function InstructionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Modern Header - Consistent with Assets */}
      <div className="fixed top-0 left-0 md:left-64 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="px-4 md:px-6 py-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-green-600" />
              Hướng dẫn Sử dụng
            </h1>

            {/* Quick Navigation - Like Assets dashboard stats */}
            <div className="flex items-center gap-3 md:gap-4 text-sm">
              <a
                href="#desktop-install"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg font-medium hover:bg-purple-200 transition-colors duration-200"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Desktop</span>
              </a>
              <a
                href="#mobile-install"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition-colors duration-200"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile</span>
              </a>
              <a
                href="#qr-scanner"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-lg font-medium hover:bg-orange-200 transition-colors duration-200"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Camera</span>
              </a>
              <a
                href="#quick-tips"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg font-medium hover:bg-yellow-200 transition-colors duration-200"
              >
                <Info className="h-3.5 w-3.5" />
                <span>Tips</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 md:pt-28 px-2 md:px-6 pb-20 md:pb-6">
        <div className="space-y-6">

          {/* PWA Installation Guide */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden scroll-mt-24" id="pwa-installation">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Info className="h-5 w-5 text-purple-600" />
                Hướng dẫn cài đặt PWA
              </h2>
              <p className="text-sm text-gray-600 mt-1">Cài đặt ứng dụng để sử dụng offline và có trải nghiệm tốt hơn</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mobile Installation */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 scroll-mt-24" id="mobile-install">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Cài đặt trên Mobile
                  </h3>
                  <div className="space-y-4 text-sm text-gray-700">
                    <div>
                      <div className="font-semibold text-gray-800 mb-2">📱 iOS (Safari):</div>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Mở Safari và truy cập website</li>
                        <li>Nhấn nút <strong>Chia sẻ</strong> (icon mũi tên hướng lên)</li>
                        <li>Cuộn xuống và chọn <strong>"Add to Home Screen"</strong></li>
                        <li>Đặt tên cho app và nhấn <strong>"Add"</strong></li>
                      </ol>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 mb-2">🤖 Android (Chrome):</div>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Mở Chrome và truy cập website</li>
                        <li>Nhấn menu <strong>(3 chấm dọc)</strong> ở góc phải</li>
                        <li>Chọn <strong>"Add to Home screen"</strong></li>
                        <li>Đặt tên cho app và nhấn <strong>"Add"</strong></li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Desktop Installation */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 scroll-mt-24" id="desktop-install">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Cài đặt trên Desktop
                  </h3>
                  <div className="space-y-4 text-sm text-gray-700">
                    <div>
                      <div className="font-semibold text-gray-800 mb-2">💻 Chrome/Edge:</div>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Tìm icon <strong>"Install"</strong> bên phải address bar</li>
                        <li>Hoặc nhấn menu → chọn <strong>"Install Kiểm kê tài sản"</strong></li>
                        <li>Nhấn <strong>"Install"</strong> để xác nhận</li>
                        <li>App sẽ mở như một ứng dụng độc lập</li>
                      </ol>
                    </div>
                    <div className="bg-purple-100 border border-purple-200 p-3 rounded-lg">
                      <div className="text-sm font-semibold text-purple-800 mb-2">✨ Lợi ích của PWA:</div>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• <strong>Hoạt động offline</strong> - Sử dụng được khi không có mạng</li>
                        <li>• <strong>Tốc độ nhanh</strong> - Khởi động và tải trang nhanh hơn</li>
                        <li>• <strong>Giao diện native</strong> - Trải nghiệm như app di động thật</li>
                        <li>• <strong>Không cần App Store</strong> - Cài đặt trực tiếp từ web</li>
                        <li>• <strong>Tự động cập nhật</strong> - Luôn có phiên bản mới nhất</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Scanner Usage Guide */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden scroll-mt-24" id="qr-scanner">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Camera className="h-5 w-5 text-orange-600" />
                Hướng dẫn sử dụng Camera quét QR
              </h2>
              <p className="text-sm text-gray-600 mt-1">Các bước và mẹo để quét mã QR hiệu quả</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Camera Setup */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4" id="camera-setup">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <ScanLine className="h-4 w-4" />
                    Chuẩn bị quét QR
                  </h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Cấp quyền camera:</strong> Khi được hỏi, nhấn "Allow" để cho phép truy cập camera
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Kiểm tra ánh sáng:</strong> Đảm bảo có đủ ánh sáng để camera nhận diện rõ mã QR
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Làm sạch camera:</strong> Lau sạch ống kính camera trước khi quét
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scanning Tips */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4" id="scanning-tips">
                  <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Kỹ thuật quét hiệu quả
                  </h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Khoảng cách:</strong> Giữ camera cách mã QR khoảng 10-30cm
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Giữ ổn định:</strong> Không rung lắc, giữ camera thẳng và ổn định
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Căn chỉnh:</strong> Đặt mã QR vào giữa khung hình vuông trên màn hình
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Đợi tự động:</strong> Không cần nhấn nút, hệ thống sẽ tự động nhận diện
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Common Issues */}
              <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl scroll-mt-24" id="troubleshooting">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Xử lý sự cố thường gặp
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-amber-800">
                  <div><strong>Camera không hoạt động:</strong> Kiểm tra quyền truy cập camera trong cài đặt trình duyệt</div>
                  <div><strong>Không quét được:</strong> Thử tăng/giảm khoảng cách hoặc cải thiện ánh sáng</div>
                  <div><strong>Quét chậm:</strong> Đợi một chút để camera lấy nét, không di chuyển quá nhanh</div>
                  <div><strong>Mã QR mờ:</strong> Kiểm tra mã QR có bị hỏng hay không, in lại nếu cần</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl shadow-lg p-6 scroll-mt-24" id="quick-tips">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              💡 Mẹo sử dụng hiệu quả
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div><strong>Tối ưu hóa tốc độ:</strong> Sử dụng app đã cài đặt thay vì mở trình duyệt</div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div><strong>Quét hàng loạt:</strong> Sau khi quét 1 mã, camera tự động tiếp tục quét mã tiếp theo</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div><strong>Làm việc offline:</strong> Dữ liệu đã quét sẽ được lưu và đồng bộ khi có mạng</div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div><strong>Backup dữ liệu:</strong> Xuất Excel định kỳ để sao lưu dữ liệu quan trọng</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  RefreshCw,
  Wifi,
  Smartphone,
  Monitor,
  Info,
  X,
  QrCode,
  Package,
  History,
  Settings,
  Check,
  Clock,
  Users,
  Shield,
  Download,
  Upload,
  Search,
  Filter,
  Mail,
  HelpCircle,
  List,
  ChevronRight,
  ChevronDown,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GuidePage() {
  const [showPWAGuide, setShowPWAGuide] = useState(false);
  const [showTOCDropdown, setShowTOCDropdown] = useState(false);

  const sections = [
    { id: 'pwa-installation', title: 'Cài đặt PWA (Progressive Web App)', icon: Smartphone },
    { id: 'quick-start', title: 'Bắt đầu nhanh', icon: QrCode },
    { id: 'offline-online', title: 'Hoạt động Offline/Online & Nút Làm mới', icon: Wifi },
    { id: 'scenarios', title: 'Các kịch bản hoạt động', icon: FileText },
    { id: 'features-guide', title: 'Hướng dẫn tính năng chi tiết', icon: Package },
    { id: 'troubleshooting', title: 'Khắc phục sự cố', icon: Shield },
    { id: 'about', title: 'Về ứng dụng', icon: HelpCircle },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Calculate offset to account for sticky header and TOC
      const headerOffset = 140; // Header + TOC button height + padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      setShowTOCDropdown(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 relative z-30">
        <div className="px-6 py-3">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Hướng dẫn sử dụng
          </h1>
        </div>
      </div>

      {/* Sticky Table of Contents Dropdown */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="px-6 py-3">
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowTOCDropdown(!showTOCDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300 transition-all duration-200"
            >
              <List className="h-4 w-4" />
              <span className="font-medium">Mục lục</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showTOCDropdown ? 'rotate-180' : ''}`} />
            </Button>

            {/* Dropdown Menu */}
            {showTOCDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTOCDropdown(false)}
                />

                {/* Dropdown Content */}
                <div className="absolute top-full left-0 mt-2 w-96 bg-gray-50 rounded-lg shadow-xl border-2 border-gray-300 z-20 max-h-96 overflow-y-auto">
                  <div className="p-3">
                    {sections.map((section, index) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className="w-full text-left px-4 py-4 text-sm text-gray-800 hover:bg-white hover:text-blue-700 rounded-lg transition-all duration-200 flex items-center gap-3 group shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                      >
                        <div className="w-8 h-8 bg-white group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors shadow-sm">
                          <section.icon className="h-4 w-4 text-gray-700 group-hover:text-blue-700" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{section.title}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {index === 0 && "Cài đặt ứng dụng như app native"}
                            {index === 1 && "Hướng dẫn sử dụng cơ bản"}
                            {index === 2 && "Hướng dẫn làm việc offline/online"}
                            {index === 3 && "Các tình huống sử dụng thực tế"}
                            {index === 4 && "Chi tiết từng tính năng"}
                            {index === 5 && "Giải quyết các vấn đề thường gặp"}
                            {index === 6 && "Thông tin về ứng dụng"}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-6 pb-48 md:pb-6 space-y-8">

          {/* PWA Installation */}
          <Card id="pwa-installation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                Cài đặt PWA (Progressive Web App)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 mb-3">
                  <strong>💡 Lợi ích:</strong> Sử dụng như app native, offline capable, faster loading
                </p>
                <Button
                  onClick={() => setShowPWAGuide(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Xem hướng dẫn cài đặt
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Start */}
          <Card id="quick-start">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-green-600" />
                Bắt đầu nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">📱 Trên Mobile</h3>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      Mở app trên điện thoại
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      Vào tab "QR Scanner"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      Quét mã QR trên tài sản
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                      Click "Kiểm kê" để xác nhận
                    </li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">💻 Trên Desktop</h3>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-green-100 text-green-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      Vào tab "Tài sản"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-green-100 text-green-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      Tìm kiếm tài sản cần kiểm
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-green-100 text-green-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      Click vào tài sản → "Kiểm kê"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-green-100 text-green-800 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                      Hoặc chọn nhiều → "Check" hàng loạt
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Offline/Online Guide */}
          <Card id="offline-online">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-green-600" />
                Hoạt động Offline/Online & Nút Làm mới
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Refresh Button Guide */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-green-600" />
                  Nút "Làm mới" - Vị trí và cách dùng
                </h3>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>📍 Vị trí:</strong> Góc phải trên của mỗi tab (cùng hàng với tiêu đề)</p>
                  <p><strong>🎯 Mục đích:</strong> Force sync dữ liệu mới nhất từ server, bypass cache</p>
                  <p><strong>⚡ Khi dùng:</strong> WiFi yếu, nghi ngờ data cũ, sau offline lâu</p>
                  <p><strong>🔄 Animation:</strong> Icon xoay khi đang loading, có text "Làm mới"</p>
                </div>
              </div>

              {/* Scenarios */}
              <div className="space-y-4" id="scenarios">
                <h3 className="font-semibold text-gray-900">Các kịch bản hoạt động:</h3>

                {/* Online Scenario */}
                <div className="border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h4 className="font-medium text-green-700">🌐 Khi có Internet (Online)</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1 ml-5">
                    <li>• <strong>Real-time sync:</strong> Dữ liệu đồng bộ tự động với users khác</li>
                    <li>• <strong>Live updates:</strong> User A check tài sản → User B thấy ngay</li>
                    <li>• <strong>Auto refresh:</strong> Switch tab hoặc mở lại app → tự động cập nhật</li>
                    <li>• <strong>Background sync:</strong> Liên tục nhận updates từ server</li>
                  </ul>
                </div>

                {/* Offline Scenario */}
                <div className="border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <h4 className="font-medium text-orange-700">📱 Khi mất Internet (Offline)</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1 ml-5">
                    <li>• <strong>Local storage:</strong> Dữ liệu lưu trong máy, vẫn xem được</li>
                    <li>• <strong>Queue actions:</strong> Check/uncheck assets vẫn hoạt động</li>
                    <li>• <strong>Pending sync:</strong> Thao tác được queue, chờ online</li>
                    <li>• <strong>Offline indicator:</strong> Hiển thị trạng thái offline</li>
                  </ul>
                </div>

                {/* Reconnect Scenario */}
                <div className="border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h4 className="font-medium text-blue-700">🔄 Khi có Internet trở lại</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1 ml-5">
                    <li>• <strong>Auto sync:</strong> Tự động đồng bộ các thao tác đã queue</li>
                    <li>• <strong>Conflict resolution:</strong> Timestamp mới nhất thắng</li>
                    <li>• <strong>Manual refresh:</strong> Click "Làm mới" để đảm bảo sync 100%</li>
                    <li>• <strong>Real-time resume:</strong> Tiếp tục nhận live updates</li>
                  </ul>
                </div>

                {/* Multi-user Scenario */}
                <div className="border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <h4 className="font-medium text-purple-700">👥 Nhiều người dùng cùng lúc</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1 ml-5">
                    <li>• <strong>Tất cả online:</strong> Thay đổi sync ngay lập tức</li>
                    <li>• <strong>A online, B offline:</strong> B sync khi có mạng trở lại</li>
                    <li>• <strong>Conflict handling:</strong> Check sau cùng được ưu tiên</li>
                    <li>• <strong>Race conditions:</strong> Timestamp quyết định thắng thua</li>
                  </ul>
                </div>
              </div>

              {/* Best Practices */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Lời khuyên sử dụng</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Khi nghi ngờ data:</strong> Click "Làm mới" để chắc chắn</li>
                  <li>• <strong>Sau offline lâu:</strong> Luôn refresh trước khi làm việc</li>
                  <li>• <strong>WiFi yếu:</strong> Refresh thủ công thay vì đợi auto sync</li>
                  <li>• <strong>Làm việc nhóm:</strong> Refresh thường xuyên để thấy updates từ đồng nghiệp</li>
                  <li>• <strong>Critical data:</strong> Refresh trước khi export hoặc báo cáo</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Features Guide */}
          <Card id="features-guide">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Hướng dẫn tính năng chi tiết
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assets Management */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  Quản lý tài sản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">📝 Thêm/Sửa tài sản:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Click "Thêm" để tạo tài sản mới</li>
                      <li>• Click vào tài sản để xem/sửa chi tiết</li>
                      <li>• Upload ảnh tài sản (tùy chọn)</li>
                      <li>• Thông tin bắt buộc: Mã, Tên, Bộ phận</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">🔍 Tìm kiếm & Lọc:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Tìm theo mã, tên, serial, bộ phận</li>
                      <li>• Lọc theo trạng thái kiểm kê</li>
                      <li>• Lọc theo bộ phận, vị trí</li>
                      <li>• Sắp xếp theo các trường khác nhau</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* QR Scanner */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-blue-600" />
                  QR Scanner
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">📱 Quét QR:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Cho phép camera access</li>
                      <li>• Đưa QR code vào khung quét</li>
                      <li>• Hệ thống tự động nhận diện</li>
                      <li>• Click "Kiểm kê" để xác nhận</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">⌨️ Nhập thủ công:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Nhập mã tài sản vào ô input</li>
                      <li>• Click "Tìm kiếm" hoặc Enter</li>
                      <li>• Xem thông tin tài sản</li>
                      <li>• Thực hiện kiểm kê</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Recent Inventory */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History className="h-4 w-4 text-green-600" />
                  Kiểm kê gần đây
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">📊 Dashboard:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Tổng số lần kiểm kê</li>
                      <li>• Số lượng đã kiểm / chưa kiểm</li>
                      <li>• Thống kê real-time</li>
                      <li>• Color-coded cho dễ nhìn</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">🛠️ Thao tác:</h4>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Chọn nhiều để kiểm kê hàng loạt</li>
                      <li>• Export dữ liệu ra Excel</li>
                      <li>• Xóa lịch sử kiểm kê cũ</li>
                      <li>• Tìm kiếm và lọc chi tiết</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card id="about">
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
                        <Mail className="h-3 w-3" />
                        <span className="font-medium">Liên hệ:</span> mr.ngoctmn@gmail.com
                      </p>
                      <p className="flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        <span className="font-medium">Phiên bản:</span> 1.0.0
                      </p>
                      <p className="flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        <span className="font-medium">Cập nhật lần cuối:</span> {new Date().toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card id="troubleshooting">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" />
                Khắc phục sự cố
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="border-l-4 border-red-400 pl-4">
                  <h4 className="font-medium text-red-700">❌ Camera không hoạt động</h4>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Cho phép camera access trong browser</li>
                    <li>• Thử refresh trang (F5)</li>
                    <li>• Sử dụng HTTPS thay vì HTTP</li>
                    <li>• Thử browser khác (Chrome recommended)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-400 pl-4">
                  <h4 className="font-medium text-orange-700">⚠️ Dữ liệu không sync</h4>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Click nút "Làm mới" ở góc phải</li>
                    <li>• Kiểm tra kết nối Internet</li>
                    <li>• Đăng xuất rồi đăng nhập lại</li>
                    <li>• Clear browser cache</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-400 pl-4">
                  <h4 className="font-medium text-blue-700">🔄 App chạy chậm</h4>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Close các tab browser khác</li>
                    <li>• Restart browser</li>
                    <li>• Sử dụng WiFi thay vì 4G</li>
                    <li>• Cài đặt như PWA để tốc độ tối ưu</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* PWA Install Guide Modal */}
      {showPWAGuide && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Hướng dẫn cài đặt PWA
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPWAGuide(false)}
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
                      <div className="space-y-1">
                        <p className="font-medium text-blue-700">📱 iOS (Safari):</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Mở website trong Safari</li>
                          <li>Tap icon "Share" (mũi tên lên)</li>
                          <li>Chọn "Add to Home Screen"</li>
                          <li>Tap "Add" để xác nhận</li>
                        </ol>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium text-green-700">🤖 Android (Chrome):</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Mở website trong Chrome</li>
                          <li>Tap menu (3 chấm dọc)</li>
                          <li>Chọn "Add to Home screen"</li>
                          <li>Tap "Add" để cài đặt</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Desktop Installation */}
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-blue-600" />
                      Cài đặt trên Desktop
                    </h4>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="space-y-1">
                        <p className="font-medium text-blue-700">💻 Chrome/Edge:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Mở website trong Chrome/Edge</li>
                          <li>Click icon "Install" trên address bar</li>
                          <li>Hoặc Menu → "Install [App name]"</li>
                          <li>Click "Install" để xác nhận</li>
                        </ol>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium text-orange-700">🦊 Firefox:</p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Bookmark trang web</li>
                          <li>Right-click bookmark</li>
                          <li>Chọn "Properties"</li>
                          <li>Check "Load this bookmark in sidebar"</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>💡 Lưu ý:</strong> Sau khi cài đặt, app sẽ hoạt động như ứng dụng native,
                  có thể sử dụng offline và tải nhanh hơn.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
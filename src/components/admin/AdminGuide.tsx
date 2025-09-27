'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Key,
  Users,
  Building,
  Package,
  DollarSign,
  Shield,
  AlertCircle,
  CheckCircle,
  Download,
  Copy,
  Search,
  Eye,
  Edit,
  RefreshCw,
  Plus,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export default function AdminGuide() {
  const [activeSection, setActiveSection] = useState('overview');

  const guideSections: GuideSection[] = [
    {
      id: 'overview',
      title: 'Tổng quan hệ thống',
      icon: Shield,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Chào mừng đến Admin Dashboard</h3>
            <p className="text-blue-800">
              Đây là hệ thống quản lý license và subscription cho ứng dụng Kiểm kê tài sản QR.
              Bạn có thể tạo, theo dõi và quản lý các license key cho khách hàng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="h-5 w-5 text-purple-600" />
                  <h4 className="font-medium">License Management</h4>
                </div>
                <p className="text-sm text-gray-600">Tạo và quản lý license keys cho khách hàng</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium">User Tracking</h4>
                </div>
                <p className="text-sm text-gray-600">Theo dõi người dùng và công ty sử dụng license</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium">Revenue Tracking</h4>
                </div>
                <p className="text-sm text-gray-600">Theo dõi doanh thu và thống kê tài chính</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h4 className="font-medium">Status Monitoring</h4>
                </div>
                <p className="text-sm text-gray-600">Giám sát trạng thái và hạn sử dụng license</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'license-management',
      title: 'Quản lý License',
      icon: Key,
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Hướng dẫn quản lý License Keys</h3>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plus className="h-4 w-4 text-blue-600" />
                  Tạo License mới
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                    <span>Nhấn nút "Tạo License Mới" ở góc trên bên phải</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                    <span>Điền thông tin công ty và email khách hàng</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                    <span>Chọn gói dịch vụ (Basic/Pro/Enterprise)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                    <span>Điều chỉnh thời hạn và giá nếu cần thiết</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">5</span>
                    <span>Thêm ghi chú và nhấn "Tạo License"</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4 text-green-600" />
                  Tìm kiếm và lọc License
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>Sử dụng ô tìm kiếm để tìm theo key code, tên công ty, email hoặc plan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>Xem thống kê tổng quan ở đầu trang</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>Nhấn "Chi tiết" để xem thông tin đầy đủ của license</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-4 w-4 text-purple-600" />
                  Xuất dữ liệu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>Nhấn "Xuất CSV" để tải về file Excel với tất cả thông tin license</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>File bao gồm: Key code, thông tin công ty, giá, thời hạn, usage stats</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'pricing',
      title: 'Bảng giá & Gói dịch vụ',
      icon: DollarSign,
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Thông tin gói dịch vụ và giá cả</h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-2 border-blue-200">
              <CardHeader className="text-center">
                <CardTitle className="text-blue-600">Basic Plan</CardTitle>
                <div className="text-2xl font-bold text-gray-900">5,000,000 VNĐ</div>
                <div className="text-sm text-gray-600">/ năm</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>3 công ty</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>50 người dùng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>5,000 tài sản</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Báo cáo cơ bản</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Support email</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader className="text-center">
                <CardTitle className="text-purple-600">Pro Plan</CardTitle>
                <div className="text-2xl font-bold text-gray-900">12,000,000 VNĐ</div>
                <div className="text-sm text-gray-600">/ năm</div>
                <div className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">Phổ biến</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>10 công ty</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>200 người dùng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>20,000 tài sản</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Báo cáo nâng cao</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>API access</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-yellow-200">
              <CardHeader className="text-center">
                <CardTitle className="text-yellow-600">Enterprise</CardTitle>
                <div className="text-2xl font-bold text-gray-900">25,000,000 VNĐ</div>
                <div className="text-sm text-gray-600">/ năm</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Không giới hạn công ty</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Không giới hạn người dùng</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Không giới hạn tài sản</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Custom reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Custom integrations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">Chính sách giá</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Giá trên là cho license 12 tháng</li>
                <li>• Có thể điều chỉnh thời hạn từ 1-36 tháng</li>
                <li>• Giảm giá 10% cho license từ 24 tháng trở lên</li>
                <li>• Hỗ trợ gia hạn và upgrade gói dịch vụ</li>
                <li>• Hoàn tiền trong 30 ngày nếu không hài lòng</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'status-guide',
      title: 'Trạng thái License',
      icon: AlertCircle,
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Hướng dẫn về trạng thái License</h3>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-800">Active (Đang hoạt động)</h4>
                </div>
                <p className="text-sm text-gray-600">
                  License đang hoạt động bình thường, trong thời hạn sử dụng và chưa vượt quá giới hạn.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Suspended (Tạm ngưng)</h4>
                </div>
                <p className="text-sm text-gray-600">
                  License bị tạm ngưng do vi phạm điều khoản hoặc vượt quá giới hạn sử dụng.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-800">Expired (Đã hết hạn)</h4>
                </div>
                <p className="text-sm text-gray-600">
                  License đã hết thời hạn sử dụng và cần được gia hạn.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="text-orange-800">Cảnh báo hết hạn</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-orange-800">
                <li>• Hệ thống sẽ gửi email cảnh báo trước 30 ngày</li>
                <li>• Cảnh báo thứ 2 được gửi trước 7 ngày</li>
                <li>• Cảnh báo cuối cùng được gửi trước 1 ngày</li>
                <li>• License tự động chuyển sang trạng thái "Expired" khi hết hạn</li>
                <li>• Khách hàng có thêm 30 ngày grace period để gia hạn</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'support',
      title: 'Hỗ trợ & Liên hệ',
      icon: MessageCircle,
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Thông tin liên hệ và hỗ trợ</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Hotline hỗ trợ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Số điện thoại:</span>
                    <span className="font-medium">0123 456 789</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Thời gian:</span>
                    <span className="font-medium">8:00 - 18:00 (T2-T6)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-green-600" />
                  Email hỗ trợ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Admin support:</span>
                    <span className="font-medium">admin@kiemke.com</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Technical:</span>
                    <span className="font-medium">tech@kiemke.com</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Quy trình xử lý sự cố</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Khách hàng báo cáo sự cố qua email hoặc hotline</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Team support xác nhận và phân loại vấn đề</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Chuyển cho technical team xử lý (nếu cần)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                  <span>Cập nhật tiến độ và thông báo kết quả cho khách hàng</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="flex items-center gap-2" variant="outline">
              <ExternalLink className="h-4 w-4" />
              Documentation
            </Button>
            <Button className="flex items-center gap-2" variant="outline">
              <Download className="h-4 w-4" />
              User Manual
            </Button>
            <Button className="flex items-center gap-2" variant="outline">
              <MessageCircle className="h-4 w-4" />
              Live Chat
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Hướng dẫn Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {guideSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-6">
              {guideSections.find(section => section.id === activeSection)?.content}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
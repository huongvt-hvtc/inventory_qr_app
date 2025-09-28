'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Building,
  Users,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { License } from '@/types/license';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);

  // Load licenses on component mount
  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenses(data || []);
    } catch (error) {
      console.error('Error loading licenses:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Calculate statistics
  const totalRevenue = licenses.reduce((sum, l) => sum + (l.price || 0), 0);
  const activeLicenses = licenses.filter(l => l.status === 'active');
  const expiredLicenses = licenses.filter(l => l.status === 'expired');
  const suspendedLicenses = licenses.filter(l => l.status === 'suspended');

  // Recent licenses (last 7 days)
  const recentLicenses = licenses.filter(l => {
    const createDate = new Date(l.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createDate >= weekAgo;
  });

  // Expiring soon (next 30 days)
  const expiringSoon = licenses.filter(l => {
    const expireDate = new Date(l.valid_until);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expireDate <= thirtyDaysFromNow && l.status === 'active';
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Tổng quan hệ thống quản lý license</p>
        </div>
        <Button
          onClick={loadLicenses}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng Licenses</p>
                <p className="text-2xl font-bold text-gray-900">{licenses.length}</p>
              </div>
              <Key className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang hoạt động</p>
                <p className="text-2xl font-bold text-green-600">{activeLicenses.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hết hạn</p>
                <p className="text-2xl font-bold text-red-600">{expiredLicenses.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng doanh thu</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatPrice(totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tạm ngưng</p>
                <p className="text-2xl font-bold text-yellow-600">{suspendedLicenses.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mới trong tuần</p>
                <p className="text-2xl font-bold text-blue-600">{recentLicenses.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sắp hết hạn</p>
                <p className="text-2xl font-bold text-orange-600">{expiringSoon.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Licenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Licenses mới nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLicenses.length > 0 ? (
              <div className="space-y-3">
                {recentLicenses.slice(0, 5).map((license) => (
                  <div key={license.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{license.owner_email}</div>
                      <div className="text-xs text-gray-600 font-mono">{license.id.slice(0, 8)}...</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium capitalize">{license.plan_type}</div>
                      <div className="text-xs text-gray-600">{formatDate(license.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Không có license mới trong tuần</p>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Sắp hết hạn (30 ngày)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringSoon.length > 0 ? (
              <div className="space-y-3">
                {expiringSoon.slice(0, 5).map((license) => (
                  <div key={license.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <div className="font-medium text-sm">{license.owner_email}</div>
                      <div className="text-xs text-gray-600 font-mono">{license.id.slice(0, 8)}...</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-orange-600">Hết hạn</div>
                      <div className="text-xs text-orange-700">{formatDate(license.valid_until)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Không có license nào sắp hết hạn</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Key className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium">Tạo License</h3>
              <p className="text-sm text-gray-600">Tạo license key mới</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Building className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium">Quản lý công ty</h3>
              <p className="text-sm text-gray-600">Xem các công ty đang sử dụng</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium">Người dùng</h3>
              <p className="text-sm text-gray-600">Thống kê người dùng hệ thống</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
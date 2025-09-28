'use client';

import React from 'react';
import {
  Shield,
  Users,
  Building2,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Crown,
  Mail,
  Calendar,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailLicense } from '@/hooks/useEmailLicense';
import { SUBSCRIPTION_PLANS } from '@/types/license';

interface UsageMeterProps {
  label: string;
  current: number;
  max: number;
  icon: React.ReactNode;
  color: string;
}

function UsageMeter({ label, current, max, icon, color }: UsageMeterProps) {
  const percentage = max === 999 ? Math.min((current / 100) * 100, 100) : Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80 && max !== 999;
  const isAtLimit = current >= max && max !== 999;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <div className={`text-sm font-bold ${
          isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-900'
        }`}>
          {current.toLocaleString()}/{max === 999 ? '∞' : max.toLocaleString()}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : `bg-${color}-500`
          }`}
          style={{ width: max === 999 ? '20%' : `${percentage}%` }}
        />
      </div>

      {isAtLimit && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Đã đạt giới hạn
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Gần đạt giới hạn
        </p>
      )}
    </div>
  );
}

export default function NewLicenseDisplay() {
  const { user } = useAuth();
  const { licenseInfo, loading } = useEmailLicense();

  // Show loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-gray-500" />
            Thông tin License
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Clock className="h-8 w-8 mx-auto text-gray-400 animate-pulse mb-2" />
            <p className="text-gray-600">Đang tải thông tin license...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show no license state
  if (!licenseInfo?.license) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-gray-500" />
            Trạng thái License
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Chưa có License</h3>
            <p className="text-sm text-gray-600 mb-4">
              Email của bạn chưa được gắn với license nào.
            </p>
            <p className="text-xs text-gray-500">
              Liên hệ admin để được cấp license.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { license, usage, companies = [], members = [] } = licenseInfo;
  const isOwner = license.owner_email === user?.email;

  // Check if license is expired
  const expiryDate = new Date(license.valid_until);
  const today = new Date();
  const isExpired = expiryDate < today;
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isNearExpiry = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  const planInfo = SUBSCRIPTION_PLANS[license.plan_type];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-blue-600" />
          Thông tin License
          {isOwner && (
            <span className="ml-2 text-xs bg-gold-100 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Chủ sở hữu
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License Owner Info */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              isExpired ? 'bg-red-500' : 'bg-green-500'
            }`} />
            <div>
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                License Owner
              </div>
              <div className="text-sm text-gray-600">{license.owner_email}</div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isExpired
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {isExpired ? 'Hết hạn' : 'Hoạt động'}
          </div>
        </div>

        {/* Plan Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Gói {license.plan_type.toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-blue-700">
              {planInfo?.price_display || 'Tùy chỉnh'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-blue-700">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Hết hạn: {formatDate(license.valid_until)}</span>
            </div>
            {daysUntilExpiry > 0 && (
              <span className={`font-medium ${isNearExpiry ? 'text-amber-700' : 'text-blue-700'}`}>
                ({daysUntilExpiry} ngày)
              </span>
            )}
          </div>
        </div>

        {/* Expiry Warning */}
        {(isExpired || isNearExpiry) && (
          <div className={`p-4 rounded-lg border ${
            isExpired
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`flex items-center gap-2 ${
              isExpired ? 'text-red-700' : 'text-amber-700'
            }`}>
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                {isExpired
                  ? 'License đã hết hạn!'
                  : `License sắp hết hạn trong ${daysUntilExpiry} ngày`
                }
              </span>
            </div>
            <p className={`text-sm mt-1 ${
              isExpired ? 'text-red-600' : 'text-amber-600'
            }`}>
              {isExpired
                ? 'Vui lòng liên hệ để gia hạn license.'
                : 'Vui lòng chuẩn bị gia hạn license.'
              }
            </p>
          </div>
        )}

        {/* Usage Statistics */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Thống kê sử dụng</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Companies */}
            <UsageMeter
              label="Công ty"
              current={companies.length}
              max={license.max_companies}
              icon={<Building2 className="h-4 w-4 text-blue-500" />}
              color="blue"
            />

            {/* Members */}
            <UsageMeter
              label="Thành viên"
              current={members.length}
              max={license.max_members}
              icon={<Users className="h-4 w-4 text-green-500" />}
              color="green"
            />

            {/* Assets */}
            <UsageMeter
              label="Tài sản"
              current={usage?.assets?.current || 0}
              max={license.max_assets}
              icon={<Package className="h-4 w-4 text-purple-500" />}
              color="purple"
            />

            {/* Users */}
            <UsageMeter
              label="Người dùng"
              current={usage?.users?.current || 0}
              max={license.max_users}
              icon={<Users className="h-4 w-4 text-orange-500" />}
              color="orange"
            />
          </div>
        </div>

        {/* Plan Features */}
        {planInfo && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Tính năng gói {license.plan_type}</h4>
            <div className="grid grid-cols-1 gap-2">
              {planInfo.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary for Members */}
        {!isOwner && (
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <strong>Vai trò của bạn:</strong> Thành viên
            </p>
            <p className="mt-1">Bạn có thể truy cập các công ty được phân quyền bởi chủ sở hữu license.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
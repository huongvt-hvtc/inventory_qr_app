'use client';

import React from 'react';
import {
  Shield,
  Users,
  Building,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLicense } from '@/hooks/useLicense';
import { SUBSCRIPTION_PLANS } from '@/types/license';

interface UsageMeterProps {
  label: string;
  current: number;
  max: number;
  icon: React.ReactNode;
  color: string;
}

function UsageMeter({ label, current, max, icon, color }: UsageMeterProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

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
          {current.toLocaleString()}/{max.toLocaleString()}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : `bg-${color}-500`
          }`}
          style={{ width: `${percentage}%` }}
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

export default function LicenseUsageDisplay() {
  const {
    licenseInfo,
    currentCompany,
    hasActiveLicense,
    isLicenseExpired,
    isLicenseNearExpiry,
    isTrialUser
  } = useLicense();

  if (isTrialUser || !currentCompany) {
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
              Bạn đang sử dụng phiên bản thử nghiệm với tính năng giới hạn.
            </p>
            <p className="text-xs text-gray-500">
              Liên hệ để mua license và sử dụng đầy đủ tính năng.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!licenseInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-gray-500" />
            Trạng thái License
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-600">Đang tải thông tin license...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { license, usage } = licenseInfo;
  const expired = isLicenseExpired();
  const nearExpiry = isLicenseNearExpiry();
  const planInfo = SUBSCRIPTION_PLANS[license.plan_type];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = () => {
    const expiryDate = new Date(license.valid_until);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-blue-600" />
          Thông tin License
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              expired ? 'bg-red-500' : hasActiveLicense ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <div>
              <div className="font-medium text-gray-900">License Key</div>
              <div className="text-sm text-gray-600 font-mono">{license.key_code}</div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            expired
              ? 'bg-red-100 text-red-800'
              : hasActiveLicense
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}>
            {expired ? 'Hết hạn' : hasActiveLicense ? 'Hoạt động' : 'Tạm dừng'}
          </div>
        </div>

        {/* Expiry Warning */}
        {(expired || nearExpiry) && (
          <div className={`p-4 rounded-lg border ${
            expired
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-5 w-5 ${
                expired ? 'text-red-600' : 'text-amber-600'
              }`} />
              <span className={`font-medium ${
                expired ? 'text-red-900' : 'text-amber-900'
              }`}>
                {expired ? 'License đã hết hạn' : 'License sắp hết hạn'}
              </span>
            </div>
            <p className={`text-sm ${
              expired ? 'text-red-700' : 'text-amber-700'
            }`}>
              {expired
                ? `License đã hết hạn vào ngày ${formatDate(license.valid_until)}. Liên hệ để gia hạn.`
                : `License sẽ hết hạn trong ${getDaysUntilExpiry()} ngày (${formatDate(license.valid_until)}). Hãy liên hệ để gia hạn.`
              }
            </p>
          </div>
        )}

        {/* Plan Information */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Gói dịch vụ</h4>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900 capitalize">
                  {license.plan_type.toUpperCase()}
                </div>
                {planInfo && (
                  <div className="text-sm text-blue-700">
                    {planInfo.price_display}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-blue-700">
              <Clock className="h-4 w-4 inline mr-1" />
              Đến {formatDate(license.valid_until)}
            </div>
          </div>
        </div>

        {/* Usage Meters */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Mức sử dụng</h4>

          <UsageMeter
            label="Công ty"
            current={usage.companies.current}
            max={usage.companies.max}
            icon={<Building className="h-4 w-4 text-purple-600" />}
            color="purple"
          />

          <UsageMeter
            label="Người dùng"
            current={usage.users.current}
            max={usage.users.max}
            icon={<Users className="h-4 w-4 text-green-600" />}
            color="green"
          />

          <UsageMeter
            label="Tài sản"
            current={usage.assets.current}
            max={usage.assets.max}
            icon={<Package className="h-4 w-4 text-blue-600" />}
            color="blue"
          />
        </div>

        {/* Features */}
        {planInfo && planInfo.features.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Tính năng</h4>
            <div className="grid grid-cols-1 gap-2">
              {planInfo.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium">📞 Hỗ trợ & Gia hạn:</p>
            <p>Email: sales@yourcompany.com</p>
            <p>Hotline: 0900 123 456</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
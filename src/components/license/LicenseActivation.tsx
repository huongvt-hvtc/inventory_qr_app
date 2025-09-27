'use client';

import React, { useState } from 'react';
import {
  Key,
  Building,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLicense } from '@/hooks/useLicense';

export default function LicenseActivation() {
  const { activateLicense, loading } = useLicense();
  const [keyCode, setKeyCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [errors, setErrors] = useState<{ keyCode?: string; companyName?: string }>({});

  const validateForm = () => {
    const newErrors: { keyCode?: string; companyName?: string } = {};

    if (!keyCode.trim()) {
      newErrors.keyCode = 'Vui lòng nhập license key';
    } else if (keyCode.length < 10) {
      newErrors.keyCode = 'License key không hợp lệ';
    }

    if (!companyName.trim()) {
      newErrors.companyName = 'Vui lòng nhập tên công ty';
    } else if (companyName.length < 2) {
      newErrors.companyName = 'Tên công ty phải có ít nhất 2 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const result = await activateLicense({
      key_code: keyCode.trim(),
      company_name: companyName.trim()
    });

    if (result.success) {
      setKeyCode('');
      setCompanyName('');
      setErrors({});
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-green-600" />
          Kích hoạt License
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleActivate} className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Cách nhận license key</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Liên hệ để mua license và nhận key kích hoạt:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>📧 Email: sales@yourcompany.com</li>
                  <li>📱 Hotline: 0900 123 456</li>
                  <li>💬 Zalo/Telegram: @yourcompany</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="keyCode" className="text-sm font-medium text-gray-700">
              License Key *
            </label>
            <Input
              id="keyCode"
              type="text"
              value={keyCode}
              onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
              placeholder="INV-2024-PRO-ABC123"
              className="font-mono"
              disabled={loading}
            />
            {errors.keyCode && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.keyCode}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="companyName" className="text-sm font-medium text-gray-700">
              Tên công ty *
            </label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nhập tên công ty của bạn"
              disabled={loading}
            />
            {errors.companyName && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors.companyName}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !keyCode.trim() || !companyName.trim()}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang kích hoạt...
              </>
            ) : (
              <>
                <Building className="h-4 w-4 mr-2" />
                Kích hoạt License
              </>
            )}
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 <strong>Lưu ý:</strong></p>
            <p>• Mỗi license key chỉ có thể kích hoạt số lượng công ty giới hạn</p>
            <p>• License sẽ có hiệu lực ngay sau khi kích hoạt thành công</p>
            <p>• Liên hệ support nếu gặp vấn đề khi kích hoạt</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
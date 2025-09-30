'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Download,
  X,
  Smartphone,
  Monitor,
  Share
} from 'lucide-react';
import { usePWAInstall } from '@/contexts/PWAInstallContext';

export default function PWAInstallPrompt() {
  const {
    canInstall,
    isIOS,
    isStandalone,
    isInstalled,
    showPrompt,
    installApp,
    dismissPrompt,
  } = usePWAInstall();

  if (isInstalled || isStandalone) {
    return null;
  }

  if (isIOS && showPrompt) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-blue-200 bg-blue-50 md:left-auto md:right-4 md:w-96">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2">
                Cài đặt ứng dụng
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Để cài đặt ứng dụng này trên iPhone/iPad:
              </p>
              <ol className="text-xs text-blue-700 space-y-1 mb-3">
                <li>1. Nhấn nút <Share className="h-3 w-3 inline mx-1" /> (Chia sẻ) ở thanh công cụ</li>
                <li>2. Chọn "Add to Home Screen"</li>
                <li>3. Nhấn "Add" để hoàn tất</li>
              </ol>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="text-blue-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPrompt && !isIOS && !canInstall) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-blue-200 bg-blue-50 md:left-auto md:right-4 md:w-96">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Monitor className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2">
                Cài đặt ứng dụng từ menu trình duyệt
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                Tìm tuỳ chọn "Install" hoặc "Add to Home screen" trong menu trình duyệt và làm theo hướng dẫn.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="text-blue-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPrompt && canInstall) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-green-200 bg-green-50 md:left-auto md:right-4 md:w-96">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Monitor className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900 mb-2">
                Cài đặt Asset Inventory QR
              </h3>
              <p className="text-sm text-green-800 mb-3">
                Cài đặt ứng dụng để truy cập nhanh và sử dụng offline
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={installApp}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Cài đặt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismissPrompt}
                  className="border-green-300 text-green-700"
                >
                  Để sau
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="text-green-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

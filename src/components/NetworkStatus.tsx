'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefresh } from '@/contexts/RefreshContext';

export function NetworkStatus() {
  const { isOnline, wasOffline, clearWasOffline } = useNetworkStatus();
  const { refreshFunction } = useRefresh();
  const [showReconnectPopup, setShowReconnectPopup] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnectPopup(true);
    }
  }, [isOnline, wasOffline]);

  const handleRefreshAndClose = () => {
    if (refreshFunction) {
      refreshFunction();
    }
    setShowReconnectPopup(false);
    clearWasOffline();
  };

  const handleClosePopup = () => {
    setShowReconnectPopup(false);
    clearWasOffline();
  };

  return (
    <>
      {/* WiFi Indicator */}
      <div className={`flex items-center transition-all duration-300 ${
        isOnline ? 'text-green-600' : 'text-red-500'
      }`}>
        {isOnline ? (
          <Wifi className="h-5 w-5" />
        ) : (
          <WifiOff className="h-5 w-5 animate-pulse" />
        )}
      </div>

      {/* Reconnect Popup */}
      {showReconnectPopup && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Wifi className="h-6 w-6 text-green-600" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Đã kết nối lại internet!
                </h3>

                <p className="text-gray-600 mb-6">
                  Bạn có muốn refresh dữ liệu để cập nhật thông tin mới nhất không?
                </p>

                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleClosePopup}
                  >
                    Bỏ qua
                  </Button>

                  <Button
                    onClick={handleRefreshAndClose}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh ngay
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
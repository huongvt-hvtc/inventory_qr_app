'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Camera,
  CameraOff,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

interface QRScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: any) => void;
  onScanError?: (error: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export default function QRScanner({ onScanSuccess, onScanError, isActive, onToggle }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [scannerConfig, setScannerConfig] = useState({
    fps: 10,
    qrbox: 250, // Use single number for better compatibility
    aspectRatio: 1.0,
    disableFlip: false // Allow both orientations
  });

  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (isActive && isSupported && permissionStatus !== 'denied') {
      startScanner();
    } else {
      stopScanner();
    }
  }, [isActive, isSupported, permissionStatus]);

  const checkCameraSupport = async () => {
    try {
      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        return;
      }

      // Check camera permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');

      if (!hasCamera) {
        setIsSupported(false);
        return;
      }

      // Try to get camera permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionStatus('granted');
      } catch (error) {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error checking camera support:', error);
      setIsSupported(false);
    }
  };

  const startScanner = () => {
    if (scannerRef.current) {
      stopScanner();
    }

    try {
      console.log('🚀 Starting QR scanner with config:', scannerConfig);

      const config = {
        fps: scannerConfig.fps,
        qrbox: scannerConfig.qrbox,
        aspectRatio: scannerConfig.aspectRatio,
        disableFlip: scannerConfig.disableFlip,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: false, // Disable zoom for better performance
        defaultZoomValueIfSupported: 1,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: true, // Enable for debugging
        rememberLastUsedCamera: true,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] // Only QR codes for better performance
      };

      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        config,
        false
      );

      scannerRef.current.render(
        (decodedText, decodedResult) => {
          console.log('✅ QR scan success:', {
            decodedText,
            decodedResult
          });

          // Stop scanner temporarily to prevent multiple scans
          if (scannerRef.current) {
            try {
              scannerRef.current.pause(true);
              setTimeout(() => {
                if (scannerRef.current) {
                  scannerRef.current.resume();
                }
              }, 3000); // Resume after 3 seconds
            } catch (pauseError) {
              console.warn('Could not pause scanner:', pauseError);
            }
          }

          onScanSuccess(decodedText, decodedResult);
          toast.success('Đã quét thành công mã QR!');
        },
        (error) => {
          // Only log significant errors, not frame-by-frame scanning attempts
          if (!error.includes('NotFoundException') &&
              !error.includes('No MultiFormat Readers') &&
              !error.includes('Not Found') &&
              !error.includes('No barcode or QR code detected')) {
            console.warn('⚠️ QR scan error:', error);
            if (onScanError) {
              onScanError(error);
            }
          } else {
            // This is normal - scanner is looking for QR codes
            console.log('🔍 Scanner active, looking for QR codes...');
          }
        }
      );

      console.log('✅ QR scanner initialized successfully');
    } catch (error) {
      console.error('❌ Error starting scanner:', error);
      toast.error('Không thể khởi động máy quét QR');
      setIsSupported(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      toast.success('Đã cấp quyền truy cập camera');
    } catch (error) {
      setPermissionStatus('denied');
      toast.error('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const updateScannerConfig = (updates: Partial<typeof scannerConfig>) => {
    setScannerConfig(prev => ({ ...prev, ...updates }));
    if (isActive) {
      // Restart scanner with new config
      setTimeout(() => {
        if (isActive) {
          startScanner();
        }
      }, 100);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-6 w-6" />
            <div>
              <div className="font-medium">Camera không được hỗ trợ</div>
              <div className="text-sm text-red-600 mt-1">
                Thiết bị của bạn không hỗ trợ camera hoặc không có camera nào được tìm thấy.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 text-orange-700">
              <CameraOff className="h-8 w-8" />
              <div>
                <div className="font-medium">Cần quyền truy cập camera</div>
                <div className="text-sm text-orange-600 mt-1">
                  Vui lòng cấp quyền truy cập camera để sử dụng chức năng quét QR.
                </div>
              </div>
            </div>
            <Button onClick={handleRequestPermission} className="bg-orange-600 hover:bg-orange-700">
              <Camera className="h-4 w-4 mr-2" />
              Cấp quyền camera
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scanner Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={onToggle}
            variant={isActive ? "danger" : "default"}
            className={isActive ? "" : "bg-green-600 hover:bg-green-700"}
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Dừng quét
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Bắt đầu quét
              </>
            )}
          </Button>

          {isActive && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Đang quét...</span>
            </div>
          )}
        </div>

        {/* Scanner Settings */}
        <div className="flex items-center gap-2">
          <select
            value={scannerConfig.fps}
            onChange={(e) => updateScannerConfig({ fps: parseInt(e.target.value) })}
            className="text-xs border rounded px-2 py-1"
            disabled={isActive}
          >
            <option value={5}>5 FPS</option>
            <option value={10}>10 FPS</option>
            <option value={15}>15 FPS</option>
            <option value={20}>20 FPS</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newSize = scannerConfig.qrbox === 250 ? 300 : 200;
              updateScannerConfig({
                qrbox: newSize
              });
            }}
            disabled={isActive}
            title="Thay đổi kích thước vùng quét"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scanner Area */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <div
              id="qr-reader"
              className="w-full"
              style={{
                minHeight: isActive ? '400px' : '200px',
                backgroundColor: isActive ? 'transparent' : '#f8f9fa'
              }}
            />

            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    Nhấn "Bắt đầu quét" để kích hoạt camera
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scanner Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">Hướng dẫn quét QR:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Giữ camera ổn định và hướng về phía mã QR</li>
            <li>• Đảm bảo có đủ ánh sáng</li>
            <li>• Giữ khoảng cách từ 10-30cm từ mã QR</li>
            <li>• Đợi cho đến khi mã QR được nhận diện tự động</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
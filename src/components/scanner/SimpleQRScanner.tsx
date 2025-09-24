'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Camera,
  CameraOff,
  AlertCircle,
  RefreshCw,
  Scan,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SimpleQRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export default function SimpleQRScanner({ onScanSuccess, onScanError, isActive, onToggle }: SimpleQRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (isActive && isSupported && permissionStatus === 'granted' && cameras.length > 0) {
      startScanner();
    } else {
      stopScanner();
    }
  }, [isActive, isSupported, permissionStatus, currentCameraIndex]);

  const checkCameraSupport = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionStatus('granted');

        const devices = await Html5Qrcode.getCameras();
        console.log('📷 Available cameras:', devices);
        setCameras(devices);

        if (devices.length > 0) {
          // Prefer back camera for mobile devices
          const backCameraIndex = devices.findIndex(device =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );
          setCurrentCameraIndex(backCameraIndex !== -1 ? backCameraIndex : 0);
        }
      } catch (error) {
        console.error('Camera permission denied:', error);
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error checking camera support:', error);
      setIsSupported(false);
    }
  };

  const startScanner = async () => {
    if (scannerRef.current) {
      await stopScanner();
    }

    setIsLoading(true);

    try {
      console.log('🚀 Starting QR scanner with camera:', cameras[currentCameraIndex]);

      scannerRef.current = new Html5Qrcode('qr-reader-viewport');

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Square QR box - always square regardless of screen size
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * 0.7); // 70% of smallest dimension
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: 16/9, // Fixed 16:9 aspect ratio
        disableFlip: false,
        videoConstraints: {
          facingMode: cameras[currentCameraIndex]?.label?.toLowerCase().includes('front')
            ? "user"
            : "environment"
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // Only QR codes
      };

      await scannerRef.current.start(
        cameras[currentCameraIndex].id,
        config,
        (decodedText) => {
          console.log('✅ QR Code detected:', decodedText);
          onScanSuccess(decodedText);
          
          // Vibrate if available (mobile)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          // Brief pause to prevent multiple rapid scans
          if (scannerRef.current && isActive) {
            scannerRef.current.pause(true);
            setTimeout(() => {
              if (scannerRef.current && isActive) {
                scannerRef.current.resume();
              }
            }, 1000);
          }
        },
        (errorMessage) => {
          // Suppress routine scanning messages
          if (!errorMessage.includes('NotFoundException') &&
              !errorMessage.includes('No MultiFormat Readers') &&
              !errorMessage.includes('code not found')) {
            console.warn('QR scan error:', errorMessage);
            if (onScanError) {
              onScanError(errorMessage);
            }
          }
        }
      );

      console.log('✅ QR scanner started successfully');
    } catch (error) {
      console.error('❌ Error starting QR scanner:', error);
      toast.error('Không thể khởi động camera');
      setIsSupported(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
        console.log('🛑 QR scanner stopped');
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    const newIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(newIndex);
    
    // Restart scanner with new camera if active
    if (isActive) {
      await stopScanner();
      await startScanner();
    }

    toast.success(`Đã chuyển sang ${cameras[newIndex].label || `Camera ${newIndex + 1}`}`);
  };

  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      toast.success('Đã cấp quyền truy cập camera');
      checkCameraSupport();
    } catch (error) {
      setPermissionStatus('denied');
      toast.error('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
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
        <Button
          onClick={onToggle}
          variant={isActive ? "destructive" : "default"}
          className={isActive ? "bg-red-600 hover:bg-red-700" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang khởi động...
            </>
          ) : isActive ? (
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

        {/* Camera Switch Button */}
        {cameras.length > 1 && isActive && (
          <Button
            onClick={switchCamera}
            variant="outline"
            size="icon"
            title="Đổi camera"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Scanner View */}
      <div className="relative rounded-lg overflow-hidden border">
        {/* Scanner Viewport */}
        <div
          id="qr-reader-viewport"
          className="relative w-full aspect-video"
          style={{
            minHeight: '300px',
            backgroundColor: '#f3f4f6'
          }}
        />

        {/* Overlay when inactive */}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-3">
              <Scan className="h-16 w-16 text-white mx-auto" />
              <div>
                <p className="text-white text-lg font-medium">
                  Sẵn sàng quét mã QR
                </p>
                <p className="text-gray-400 text-sm">
                  Nhấn "Bắt đầu quét" để kích hoạt camera
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-3">
              <Loader2 className="h-12 w-12 text-white mx-auto animate-spin" />
              <p className="text-white">Đang khởi động camera...</p>
            </div>
          </div>
        )}

        {/* Simple scanning indicator */}
        {isActive && !isLoading && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-green-600 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white">Đang quét...</span>
          </div>
        )}
      </div>

    </div>
  );
}
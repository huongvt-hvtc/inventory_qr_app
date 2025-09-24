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
  Loader2,
  QrCode
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
  const [detectedQR, setDetectedQR] = useState<string>('');
  const [showDetection, setShowDetection] = useState(false);

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
        fps: 60, // Increased to 60 FPS for iPhone-like instant detection
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Full area scanning like iPhone Camera
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * 0.95); // Nearly full screen
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: 16/9,
        disableFlip: false,
        videoConstraints: {
          facingMode: cameras[currentCameraIndex]?.label?.toLowerCase().includes('front')
            ? "user"
            : "environment",
          // Maximum quality for instant detection
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 }
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0], // Only QR codes
        // Enhanced detection settings
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        formatsToSupport: [0] // QR_CODE format
      };

      await scannerRef.current.start(
        cameras[currentCameraIndex].id,
        config,
        (decodedText) => {
          console.log('✅ QR Code detected:', decodedText);

          // Show detection immediately like iPhone Camera
          setDetectedQR(decodedText);
          setShowDetection(true);

          // Auto-hide detection after 3 seconds
          setTimeout(() => {
            setShowDetection(false);
            setDetectedQR('');
          }, 3000);

          // Call success handler
          onScanSuccess(decodedText);

          // Vibrate if available (mobile)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          // No pause - continuous scanning like iPhone Camera
        },
        (errorMessage) => {
          // Hide detection indicator when no QR found
          if (errorMessage.includes('NotFoundException') ||
              errorMessage.includes('No MultiFormat Readers') ||
              errorMessage.includes('code not found')) {
            setShowDetection(false);
            setDetectedQR('');
          } else {
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
          className={isActive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700 text-white"}
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

        {/* iPhone-style scanning indicator */}
        {isActive && !isLoading && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-green-600 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white">Đang quét...</span>
          </div>
        )}

        {/* iPhone Camera-style QR Detection Display */}
        {showDetection && detectedQR && (
          <div className="absolute bottom-6 left-4 right-4">
            <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-4 border border-yellow-400/50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-400 rounded-lg">
                  <QrCode className="h-5 w-5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-yellow-400 text-sm font-medium mb-1">
                    {(() => {
                      try {
                        const parsed = JSON.parse(detectedQR);
                        if (parsed.asset_code) {
                          return `Asset: ${parsed.asset_code}`;
                        }
                        return 'QR Code detected';
                      } catch {
                        // Check if it's a URL
                        if (detectedQR.startsWith('http')) {
                          return 'Website detected';
                        }
                        // Check if it looks like an asset code
                        if (/^[A-Z]{2}\d+/.test(detectedQR)) {
                          return `Asset code: ${detectedQR}`;
                        }
                        return 'QR Code detected';
                      }
                    })()}
                  </div>
                  <div className="text-white text-base break-all">
                    {(() => {
                      try {
                        const parsed = JSON.parse(detectedQR);
                        if (parsed.asset_code && parsed.name) {
                          return `${parsed.asset_code} - ${parsed.name}`;
                        } else if (parsed.asset_code) {
                          return parsed.asset_code;
                        }
                        return detectedQR.length > 80 ? `${detectedQR.substring(0, 80)}...` : detectedQR;
                      } catch {
                        return detectedQR.length > 80 ? `${detectedQR.substring(0, 80)}...` : detectedQR;
                      }
                    })()}
                  </div>
                  {detectedQR.length > 80 && (
                    <div className="text-gray-400 text-xs mt-1">
                      Tap to view full content
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
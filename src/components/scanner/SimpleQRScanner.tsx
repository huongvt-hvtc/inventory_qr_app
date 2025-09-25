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
  const [isSearching, setIsSearching] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScannedTextRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);


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
        // Request camera permission with specific constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        });
        stream.getTracks().forEach(track => track.stop());
        setPermissionStatus('granted');

        // Retry camera enumeration up to 3 times
        let devices: any[] = [];
        let retryCount = 0;
        const maxRetries = 3;

        while (devices.length === 0 && retryCount < maxRetries) {
          try {
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount)); // Progressive delay
            devices = await Html5Qrcode.getCameras();
            console.log(`📷 Camera scan attempt ${retryCount + 1}: Found ${devices.length} cameras`);
            retryCount++;
          } catch (cameraError) {
            console.warn(`Camera enumeration attempt ${retryCount + 1} failed:`, cameraError);
            retryCount++;
          }
        }

        console.log('📷 Final available cameras:', devices);
        setCameras(devices);

        if (devices.length > 0) {
          // Smart camera selection: prefer back/environment camera
          let selectedIndex = 0;

          // Try to find back/rear/environment camera
          const backCameraIndex = devices.findIndex(device =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );

          // If no back camera found, try to find camera with highest resolution
          if (backCameraIndex === -1) {
            // Use the last camera (often the higher quality one on mobile)
            selectedIndex = devices.length - 1;
          } else {
            selectedIndex = backCameraIndex;
          }

          console.log(`📷 Selected camera ${selectedIndex}: ${devices[selectedIndex].label}`);
          setCurrentCameraIndex(selectedIndex);
        } else {
          console.error('❌ No cameras found after retries');
          setIsSupported(false);
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

      // Auto-adjust FPS based on device performance
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const optimalFPS = isMobile ? 20 : 30;

      const config = {
        fps: 30, // Tăng FPS lên như native camera
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Scan toàn bộ viewport như iOS native camera
          return {
            width: viewfinderWidth,
            height: viewfinderHeight
          };
        },
        aspectRatio: window.innerWidth / window.innerHeight,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        showTorchButtonIfSupported: true,
        videoConstraints: {
          facingMode: cameras[currentCameraIndex]?.label?.toLowerCase().includes('front')
            ? "user"
            : "environment",
          width: { ideal: 1920, min: 1280 }, // Tăng resolution cho độ chính xác cao
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 20 }, // FrameRate cao như native
          zoom: { ideal: 1, min: 1, max: 3 } // Enable zoom nếu supported
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0, 1, 2] // QR Code, Data Matrix, Code 128
      };

      // Detect iOS for special handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      // Try multiple configurations for better compatibility
      let scanStarted = false;
      const configs = [
        // iOS optimized config
        isIOS ? {
          fps: 30,
          qrbox: { width: 300, height: 300 }, // Fixed size like iOS
          aspectRatio: 1.0,
          disableFlip: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 20 }
          }
        } : config,
        // High performance config
        {
          fps: 20,
          qrbox: (w: number, h: number) => {
            const size = Math.min(w, h) * 0.9;
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 20, min: 15 }
          }
        },
        // Fallback config
        {
          fps: 10,
          qrbox: 250,
          videoConstraints: {
            facingMode: "environment"
          }
        },
        // Last resort config
        {
          fps: 5,
          qrbox: 200,
        }
      ];

      for (let i = 0; i < configs.length && !scanStarted; i++) {
        try {
          console.log(`🔄 Trying scanner config ${i + 1}/${configs.length}`);

          await scannerRef.current.start(
            cameras[currentCameraIndex].id,
            configs[i],
            (decodedText) => {
              // Prevent duplicate scans within 500ms (iOS-like responsiveness)
              const now = Date.now();
              if (decodedText === lastScannedTextRef.current &&
                  now - lastScanTimeRef.current < 500) {
                return;
              }

              console.log('✅ QR Code detected:', decodedText);
              lastScannedTextRef.current = decodedText;
              lastScanTimeRef.current = now;

              // Clear searching state immediately
              setIsSearching(false);
              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
              }

              // Show detection immediately like iOS
              setDetectedQR(decodedText);
              setShowDetection(true);

              // Auto-hide detection after 2 seconds (faster like iOS)
              setTimeout(() => {
                setShowDetection(false);
                setDetectedQR('');
              }, 2000);

              // Immediate feedback like iOS
              if (navigator.vibrate) {
                navigator.vibrate([100]); // Single quick vibration like iOS
              }

              // Immediate success callback
              onScanSuccess(decodedText);

              // Play iOS-like sound
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 1000; // iOS-like beep frequency
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
              } catch {}
            },
            (errorMessage) => {
              // Handle scan errors more gracefully - suppress most scanning noise
              if (errorMessage.includes('NotFoundException') ||
                  errorMessage.includes('No MultiFormat Readers') ||
                  errorMessage.includes('code not found') ||
                  errorMessage.includes('No QR code') ||
                  errorMessage.includes('no pattern found')) {
                // Much faster searching animation - 300ms like iOS
                if (!isSearching && !scanTimeoutRef.current) {
                  scanTimeoutRef.current = setTimeout(() => {
                    setIsSearching(true);
                  }, 300);
                }
                // Don't show any error state - keep scanning silently
                setShowDetection(false);
                setDetectedQR('');
              } else {
                // Only log genuine technical errors, not scan attempts
                if (!errorMessage.includes('QR') && !errorMessage.includes('barcode')) {
                  console.warn('QR scan error:', errorMessage);
                  if (onScanError) {
                    onScanError(errorMessage);
                  }
                }
              }
            }
          );

          scanStarted = true;
          console.log(`✅ Scanner started successfully with config ${i + 1}`);
          break;

        } catch (configError) {
          console.warn(`❌ Config ${i + 1} failed:`, configError);
          if (i < configs.length - 1) {
            console.log(`🔄 Trying next config...`);
            // Reset scanner before trying next config
            if (scannerRef.current) {
              try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
              } catch {}
            }
            scannerRef.current = new Html5Qrcode('qr-reader-viewport');
          }
        }
      }

      if (!scanStarted) {
        throw new Error('Không thể khởi động camera với bất kỳ cấu hình nào');
      }

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

        {/* iPhone-style scanning indicator với searching state */}
        {isActive && !isLoading && (
          <>
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-green-600 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white">Đang quét...</span>
            </div>

            {/* Scanning frame overlay như app banking */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-yellow-400 rounded-br-lg"></div>
                  
                  {/* Scanning line animation khi đang tìm QR */}
                  {isSearching && (
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-scan shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Text indicator khi đang tìm với animation */}
              {isSearching && (
                <div className="absolute bottom-32 left-0 right-0 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                    <p className="text-yellow-400 text-sm font-medium">
                      Đang tìm mã QR
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* iPhone Camera-style QR Detection Display */}
        {showDetection && detectedQR && (
          <div className="absolute bottom-6 left-4 right-4 z-30">
            <div className="bg-black/90 backdrop-blur-md rounded-2xl p-4 border border-yellow-400/30 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-yellow-400 rounded-xl shadow-lg">
                  <QrCode className="h-6 w-6 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-yellow-400 text-sm font-semibold mb-1 tracking-wide">
                    {(() => {
                      try {
                        const parsed = JSON.parse(detectedQR);
                        if (parsed.asset_code) {
                          return `Mã tài sản - ${parsed.asset_code}`;
                        }
                        return 'Mã QR được phát hiện';
                      } catch {
                        // Check if it looks like an asset code
                        if (/^[A-Z]{2}\d+/.test(detectedQR)) {
                          return `Mã tài sản - ${detectedQR}`;
                        }
                        // Check if it's a URL
                        if (detectedQR.startsWith('http')) {
                          return 'Liên kết website';
                        }
                        return 'Mã QR được phát hiện';
                      }
                    })()}
                  </div>
                  <div className="text-white text-base font-medium break-all">
                    {(() => {
                      try {
                        const parsed = JSON.parse(detectedQR);
                        if (parsed.asset_code && parsed.name) {
                          return `${parsed.asset_code} - ${parsed.name}`;
                        } else if (parsed.asset_code) {
                          return parsed.asset_code;
                        }
                        return detectedQR.length > 60 ? `${detectedQR.substring(0, 60)}...` : detectedQR;
                      } catch {
                        return detectedQR.length > 60 ? `${detectedQR.substring(0, 60)}...` : detectedQR;
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hướng dẫn quét QR */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <QrCode className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-2">Hướng dẫn quét mã QR</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                <span>Giữ thiết bị ổn định, cách mã QR khoảng 10-30cm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                <span>Đảm bảo có đủ ánh sáng và mã QR không bị che khuất</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                <span>Đưa mã QR vào giữa khung vuông trên màn hình</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                <span>Chờ camera tự động nhận diện và quét mã</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
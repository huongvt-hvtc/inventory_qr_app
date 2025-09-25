'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Camera,
  CameraOff,
  AlertCircle,
  Loader2,
  QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NativeQRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

/**
 * Ultra-optimized QR Scanner using Native BarcodeDetector API when available
 * Falls back to video + canvas scanning for broader compatibility
 */
export default function NativeQRScanner({ onScanSuccess, onScanError, isActive, onToggle }: NativeQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNativeSupport, setHasNativeSupport] = useState(false);
  const [detectedQR, setDetectedQR] = useState<string>('');
  const [showDetection, setShowDetection] = useState(false);

  // Check for native BarcodeDetector support
  useEffect(() => {
    const checkSupport = async () => {
      if ('BarcodeDetector' in window) {
        try {
          const formats = await (window as any).BarcodeDetector.getSupportedFormats();
          setHasNativeSupport(formats.includes('qr_code'));
          console.log('✅ Native BarcodeDetector supported! Formats:', formats);
        } catch {
          setHasNativeSupport(false);
        }
      }
    };
    checkSupport();
  }, []);

  // Request camera permission
  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      });
      streamRef.current = stream;
      setPermissionStatus('granted');
      return stream;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setPermissionStatus('denied');
      throw error;
    }
  };

  // Native BarcodeDetector scanning
  const scanWithNativeAPI = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    
    const scan = async () => {
      if (!isActive || !videoRef.current) return;

      try {
        const barcodes = await detector.detect(videoRef.current);
        
        if (barcodes.length > 0) {
          const qrCode = barcodes[0];
          const decodedText = qrCode.rawValue;
          
          // Prevent duplicate scans
          const now = Date.now();
          if (decodedText !== lastScannedRef.current || now - lastScanTimeRef.current > 1000) {
            lastScannedRef.current = decodedText;
            lastScanTimeRef.current = now;
            
            console.log('✅ Native QR detected:', decodedText);
            
            // Visual feedback
            setDetectedQR(decodedText);
            setShowDetection(true);
            setTimeout(() => {
              setShowDetection(false);
              setDetectedQR('');
            }, 2000);
            
            // Haptic feedback
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            
            // Audio feedback
            playBeep();
            
            onScanSuccess(decodedText);
          }
        }
      } catch (error) {
        console.error('Native scan error:', error);
      }

      // Continue scanning
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(scan);
      }
    };

    scan();
  }, [isActive, onScanSuccess]);

  // Fallback: Canvas-based scanning
  const scanWithCanvas = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Import QR scanner library dynamically
    const { Html5QrcodeScanner } = await import('html5-qrcode');
    
    const scan = () => {
      if (!isActive || !videoRef.current) return;

      // Draw video frame to canvas
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Get image data and scan
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // This is where you'd integrate with a QR scanning library
      // For now, this is a placeholder
      
      // Continue scanning
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(scan);
      }
    };

    scan();
  }, [isActive]);

  // Start camera and scanning
  const startScanning = async () => {
    setIsLoading(true);
    
    try {
      // Get camera stream if not already available
      if (!streamRef.current) {
        const stream = await requestPermission();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      }

      // Start appropriate scanning method
      if (hasNativeSupport) {
        console.log('📱 Using native BarcodeDetector API');
        scanWithNativeAPI();
      } else {
        console.log('📷 Using canvas-based scanning');
        scanWithCanvas();
      }
    } catch (error) {
      console.error('Failed to start scanning:', error);
      setIsSupported(false);
      onScanError?.('Failed to start camera');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Audio feedback
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Double beep like iOS
      [1200, 1400].forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.05);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.05);
      });
    } catch {}
  };

  // Handle permission request
  const handleRequestPermission = async () => {
    try {
      await requestPermission();
      toast.success('Đã cấp quyền truy cập camera');
    } catch {
      toast.error('Không thể truy cập camera');
    }
  };

  // Effect for starting/stopping scanner
  useEffect(() => {
    if (isActive && permissionStatus === 'granted') {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isActive, permissionStatus, hasNativeSupport]);

  // UI for unsupported devices
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

  // UI for permission denied
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

        {hasNativeSupport && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            Native Scanner
          </div>
        )}
      </div>

      {/* Scanner View */}
      <div className="relative rounded-lg overflow-hidden border bg-black">
        {/* Hidden canvas for fallback scanning */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full aspect-video object-cover"
          playsInline
          muted
          style={{ minHeight: '300px' }}
        />

        {/* Overlay when inactive */}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-3">
              <QrCode className="h-16 w-16 text-white mx-auto" />
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

        {/* Scanning indicator */}
        {isActive && !isLoading && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-green-600 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-white">
              {hasNativeSupport ? 'Native Scanning...' : 'Đang quét...'}
            </span>
          </div>
        )}

        {/* Detection display */}
        {showDetection && detectedQR && (
          <div className="absolute bottom-6 left-4 right-4 z-30">
            <div className="bg-black/90 backdrop-blur-md rounded-2xl p-4 border border-yellow-400/30 shadow-2xl bounce-ios">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-yellow-400 rounded-xl shadow-lg">
                  <QrCode className="h-6 w-6 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-yellow-400 text-sm font-semibold mb-1">
                    Mã QR được phát hiện
                  </div>
                  <div className="text-white text-base font-medium break-all">
                    {detectedQR.length > 60 ? `${detectedQR.substring(0, 60)}...` : detectedQR}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

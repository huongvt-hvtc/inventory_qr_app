'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Camera, CameraOff, Zap, ZapOff, RotateCw, Loader2, QrCode } from 'lucide-react';

interface QRScannerProProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  scanRegionRatio?: number; // 0.4-0.8, kích thước vùng scan
  detectionDebounceMs?: number; // ms debounce để tránh scan lặp
  startTorchOn?: boolean;
  className?: string;
}

export default function QRScannerPro({
  onResult,
  onError,
  scanRegionRatio = 0.65,
  detectionDebounceMs = 400,
  startTorchOn = false,
  className = ''
}: QRScannerProProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const lastDetectionRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // States
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Sẵn sàng quét');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [usingNative, setUsingNative] = useState(false);

  // Camera capabilities
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(startTorchOn);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoom, setZoom] = useState<number>(1);

  // ROI style calculation
  const roiSize = `${scanRegionRatio * 100}%`;
  const roiStyle = {
    width: roiSize,
    height: roiSize,
    minWidth: '200px',
    minHeight: '200px',
    maxWidth: '400px',
    maxHeight: '400px'
  };

  // Check native BarcodeDetector support
  const checkNativeSupport = useCallback(async () => {
    if ('BarcodeDetector' in window) {
      try {
        const formats = await (window as any).BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) {
          setUsingNative(true);
          console.log('✅ Using Native BarcodeDetector API');
          return true;
        }
      } catch (e) {
        console.log('❌ BarcodeDetector not available');
      }
    }
    console.log('📷 Using ZXing fallback');
    return false;
  }, []);

  // Get available cameras
  const loadCameras = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Prefer back camera
      const backCamera = videoDevices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('rear')
      );

      setActiveDeviceId(backCamera?.deviceId || videoDevices[0]?.deviceId || '');
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      onError?.('Không thể truy cập danh sách camera');
    }
  }, [onError]);

  // Audio feedback (iOS-style double beep)
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

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
    } catch (e) {
      console.log('Audio feedback not available');
    }
  }, []);

  // Haptic feedback
  const vibrate = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }, []);

  // Handle QR detection result
  const handleDetection = useCallback((text: string) => {
    const now = Date.now();
    const last = lastDetectionRef.current;

    // Debounce: ignore if same text within debounce period
    if (text === last.text && (now - last.time) < detectionDebounceMs) {
      return;
    }

    lastDetectionRef.current = { text, time: now };

    console.log('🎯 QR Detected:', text);
    setStatus(`Đã quét: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`);

    // Feedback
    playBeep();
    vibrate();

    // Flash effect
    if (overlayRef.current) {
      overlayRef.current.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
      setTimeout(() => {
        if (overlayRef.current) {
          overlayRef.current.style.backgroundColor = 'transparent';
        }
      }, 200);
    }

    onResult(text);
  }, [detectionDebounceMs, onResult, playBeep, vibrate]);

  // Native BarcodeDetector scanning
  const scanWithNative = useCallback(async () => {
    if (!videoRef.current) return;

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

    const scan = async () => {
      if (!isActive || !videoRef.current) return;

      try {
        const barcodes = await detector.detect(videoRef.current);

        if (barcodes.length > 0) {
          const qrCode = barcodes[0];
          handleDetection(qrCode.rawValue);
        }
      } catch (error) {
        // Ignore common detection errors
        if (error && typeof error === 'object' && 'toString' in error) {
          const errorStr = error.toString();
          if (!errorStr.includes('could not locate')) {
            console.error('Native scan error:', error);
          }
        }
      }

      if (isActive) {
        requestAnimationFrame(scan);
      }
    };

    scan();
  }, [isActive, handleDetection]);

  // ZXing scanning
  const scanWithZXing = useCallback(async () => {
    if (!videoRef.current || !activeDeviceId) return;

    try {
      const codeReader = new BrowserQRCodeReader();
      codeReaderRef.current = codeReader;

      await codeReader.decodeFromVideoDevice(
        activeDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleDetection(result.getText());
          }
          // Ignore NotFoundException (no QR in frame)
          if (error && !error.toString().includes('NotFoundException')) {
            console.warn('ZXing scan error:', error);
          }
        }
      );
    } catch (error) {
      console.error('ZXing initialization error:', error);
      onError?.('Lỗi khởi tạo ZXing scanner');
    }
  }, [activeDeviceId, handleDetection, onError]);

  // Start camera and scanning
  const startScanning = useCallback(async () => {
    if (!activeDeviceId) return;

    setIsLoading(true);
    setStatus('Đang khởi động camera...');

    try {
      // Get camera stream with high quality
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: activeDeviceId },
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 }
        }
      });

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Store track for capabilities
      const videoTrack = stream.getVideoTracks()[0];
      trackRef.current = videoTrack;

      // Check camera capabilities
      const capabilities = videoTrack.getCapabilities();
      setTorchSupported('torch' in capabilities);
      setZoomSupported('zoom' in capabilities);

      if ('zoom' in capabilities) {
        const settings = videoTrack.getSettings();
        setZoom((settings as any).zoom || 1);
      }

      // Apply initial torch setting
      if (torchSupported && startTorchOn) {
        toggleTorch();
      }

      setStatus('Đang quét...');
      setIsActive(true);

      // Start appropriate scanning method
      const hasNative = await checkNativeSupport();
      if (hasNative) {
        scanWithNative();
      } else {
        scanWithZXing();
      }

    } catch (error) {
      console.error('Failed to start camera:', error);
      setStatus('Lỗi camera');
      onError?.('Không thể truy cập camera. Vui lòng kiểm tra quyền.');
    } finally {
      setIsLoading(false);
    }
  }, [activeDeviceId, checkNativeSupport, scanWithNative, scanWithZXing, torchSupported, startTorchOn, onError]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    setIsActive(false);
    setStatus('Đã dừng');

    // Stop ZXing reader
    if (codeReaderRef.current) {
      try {
        // ZXing doesn't have reset method, we need to stop the stream manually
        codeReaderRef.current = null;
      } catch (e) {
        console.warn('Failed to stop ZXing reader:', e);
      }
    }

    // Stop video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    trackRef.current = null;
  }, []);

  // Toggle torch/flashlight
  const toggleTorch = useCallback(async () => {
    if (!torchSupported || !trackRef.current) return;

    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (error) {
      console.warn('Failed to toggle torch:', error);
    }
  }, [torchSupported, torchOn]);

  // Change zoom
  const changeZoom = useCallback(async (value: number) => {
    if (!zoomSupported || !trackRef.current) return;

    try {
      await trackRef.current.applyConstraints({
        advanced: [{ zoom: value } as any]
      });
      setZoom(value);
    } catch (error) {
      console.warn('Failed to change zoom:', error);
    }
  }, [zoomSupported]);

  // Switch camera
  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;

    const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
    const nextDevice = devices[(currentIndex + 1) % devices.length];

    stopScanning();
    setActiveDeviceId(nextDevice.deviceId);
  }, [devices, activeDeviceId, stopScanning]);

  // Initialize
  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  // Auto-start when device is selected
  useEffect(() => {
    if (activeDeviceId && !isActive && !isLoading) {
      startScanning();
    }
  }, [activeDeviceId, isActive, isLoading, startScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className={`relative w-full h-[min(90vh,720px)] overflow-hidden rounded-2xl bg-black shadow-2xl ${className}`}>
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {/* Dark overlay with scan region */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 grid place-content-center transition-colors duration-200"
      >
        <div
          className="relative rounded-xl shadow-[0_0_0_200vmax_rgba(0,0,0,0.55)]"
          style={roiStyle}
        >
          {/* Corner guides */}
          <span className="pointer-events-none absolute -top-1 -left-1 h-8 w-8 border-t-4 border-l-4 border-white rounded-tl-xl opacity-90" />
          <span className="pointer-events-none absolute -top-1 -right-1 h-8 w-8 border-t-4 border-r-4 border-white rounded-tr-xl opacity-90" />
          <span className="pointer-events-none absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-white rounded-bl-xl opacity-90" />
          <span className="pointer-events-none absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-white rounded-br-xl opacity-90" />

          {/* Scanning animation */}
          {isActive && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"
                   style={{
                     animation: 'scan-line 2s ease-in-out infinite alternate',
                     transformOrigin: 'center'
                   }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Top status bar */}
      <div className="absolute left-0 right-0 top-0 p-4 flex items-center justify-center">
        <div className="px-4 py-2 rounded-full bg-black/80 backdrop-blur-md text-white text-sm font-medium border border-white/20">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            )}
            <span>{usingNative ? 'Native' : 'ZXing'} • {status}</span>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-white mx-auto animate-spin" />
            <p className="text-white text-lg font-medium">Đang khởi động camera...</p>
          </div>
        </div>
      )}

      {/* Inactive overlay */}
      {!isActive && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <QrCode className="h-16 w-16 text-white mx-auto" />
            <div>
              <p className="text-white text-xl font-medium">Sẵn sàng quét QR</p>
              <p className="text-gray-300 text-sm mt-2">Đưa mã QR vào khung để quét tự động</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute left-0 right-0 bottom-0 p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Camera switch */}
          {devices.length > 1 && (
            <button
              onClick={switchCamera}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 text-black font-medium text-sm hover:bg-white active:scale-95 transition-all disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" />
              <span className="hidden sm:inline">Đổi camera</span>
            </button>
          )}

          {/* Torch toggle */}
          {torchSupported && (
            <button
              onClick={toggleTorch}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm active:scale-95 transition-all disabled:opacity-50 ${
                torchOn
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-white/90 text-black hover:bg-white'
              }`}
            >
              {torchOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              <span className="hidden sm:inline">{torchOn ? 'Tắt đèn' : 'Bật đèn'}</span>
            </button>
          )}

          {/* Zoom control */}
          {zoomSupported && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 text-black text-sm font-medium">
              <span className="text-xs">Zoom</span>
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={zoom}
                onChange={(e) => changeZoom(Number(e.target.value))}
                className="w-20 h-1 bg-gray-300 rounded-lg appearance-none slider"
                disabled={isLoading}
              />
              <span className="text-xs w-8">{zoom.toFixed(1)}x</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #374151;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
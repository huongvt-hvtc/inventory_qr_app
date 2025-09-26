'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Camera, CameraOff, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface OptimizedScannerProps {
  onScanSuccess: (result: string) => void
  onScanError?: (error: string) => void
}

export default function OptimizedScanner({ onScanSuccess, onScanError }: OptimizedScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const lastScanTimeRef = useRef<number>(0)
  const SCAN_COOLDOWN = 2000 // 2 seconds between same code

  // Check camera permission
  const checkPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          // Add constraints for better desktop camera performance
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1.777 }
        } 
      })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
      return true
    } catch (error) {
      console.error('Camera permission error:', error)
      setHasPermission(false)
      return false
    }
  }, [])

  // Handle scan success with throttling
  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now()
    
    // Prevent duplicate scans
    if (lastScannedCode === decodedText && (now - lastScanTimeRef.current) < SCAN_COOLDOWN) {
      return
    }
    
    console.log('✅ QR Code scanned:', decodedText)
    
    // Update last scan info
    setLastScannedCode(decodedText)
    lastScanTimeRef.current = now
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(200)
    }
    
    // Visual feedback
    const scanRegion = document.querySelector('#optimized-qr-reader__scan_region')
    if (scanRegion) {
      scanRegion.classList.add('scan-success-animation')
      setTimeout(() => {
        scanRegion.classList.remove('scan-success-animation')
      }, 500)
    }
    
    // Call success callback
    onScanSuccess(decodedText)
    
    // Show success toast
    toast.success('Đã quét mã QR thành công!', {
      duration: 1500,
      position: 'top-center'
    })
  }, [onScanSuccess, lastScannedCode])

  // Initialize scanner with optimized settings
  const initScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return
    
    // Check permission first
    const hasAccess = await checkPermission()
    if (!hasAccess) {
      toast.error('Cần quyền truy cập camera để quét mã QR')
      return
    }

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      
      const config = {
        fps: 15, // Increased FPS for better detection
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Larger scan area for better detection
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const size = Math.min(
            isMobile ? 250 : 300,
            Math.floor(minEdge * 0.8) // 80% of viewport
          )
          
          return { width: size, height: size }
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        aspectRatio: isMobile ? 1.0 : 1.333, // 4:3 for desktop cameras
        showTorchButtonIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39
        ],
        // Verbose mode for better error handling
        verbose: false,
        // Focus settings for better detection
        focusMode: 'continuous',
        // Advanced settings for desktop cameras
        videoConstraints: {
          facingMode: 'environment',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { ideal: isMobile ? 1.0 : 1.333 }
        }
      }

      const scanner = new Html5QrcodeScanner(
        'optimized-qr-reader',
        config as any,
        false // verbose
      )

      scanner.render(
        handleScanSuccess,
        (error) => {
          // Ignore common scanning errors
          if (!error.includes('NotFoundException') &&
              !error.includes('No MultiFormat Readers') &&
              !error.includes('Failed to decode')) {
            console.warn('Scan error:', error)
            onScanError?.(error)
          }
        }
      )

      scannerRef.current = scanner
      setIsScanning(true)
      
      console.log('📸 Scanner initialized successfully')
    } catch (error) {
      console.error('Failed to initialize scanner:', error)
      toast.error('Không thể khởi động camera')
      setHasPermission(false)
    }
  }, [handleScanSuccess, onScanError, checkPermission])

  // Stop scanner
  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Toggle scanner
  const toggleScanner = useCallback(() => {
    if (isScanning) {
      stopScanner()
    } else {
      initScanner()
    }
  }, [isScanning, stopScanner, initScanner])

  // Request camera permission
  const requestPermission = useCallback(async () => {
    const granted = await checkPermission()
    if (granted) {
      toast.success('Đã cấp quyền camera')
      initScanner()
    } else {
      toast.error('Vui lòng cấp quyền camera trong cài đặt trình duyệt')
    }
  }, [checkPermission, initScanner])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  // Check permission on mount
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  return (
    <div className="space-y-4">
      {/* Scanner Controls - Single button only */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasPermission === false ? (
            <Button
              onClick={requestPermission}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              Cấp quyền camera
            </Button>
          ) : (
            <Button
              onClick={toggleScanner}
              variant={isScanning ? "destructive" : "default"}
              className={isScanning ? "" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              {isScanning ? (
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
          )}

          {isScanning && (
            <div className="flex items-center gap-1 text-green-600 animate-pulse">
              <div className="h-2 w-2 bg-green-600 rounded-full animate-ping" />
              <span className="text-xs font-medium">Đang quét...</span>
            </div>
          )}
        </div>

        {lastScannedCode && (
          <div className="text-xs text-gray-600">
            Vừa quét: <span className="font-mono font-semibold">{lastScannedCode}</span>
          </div>
        )}
      </div>

      {/* Scanner Area - Optimized size */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-inner" 
           style={{ 
             minHeight: window.innerWidth < 640 ? '300px' : '400px',
             maxHeight: window.innerWidth < 1024 ? '450px' : '500px' 
           }}>
        <div id="optimized-qr-reader" ref={containerRef} className="w-full scanner-container" />

        {!isScanning && hasPermission !== false && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="text-center p-6">
              <div className="relative">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                <div className="absolute inset-0 animate-ping">
                  <Camera className="h-16 w-16 text-gray-300 mx-auto opacity-50" />
                </div>
              </div>
              <p className="text-gray-600 font-medium mb-1">
                Nhấn "Bắt đầu quét" để kích hoạt camera
              </p>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-50">
            <div className="text-center p-6">
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-3" />
              <p className="text-orange-700 font-medium mb-2">
                Cần quyền truy cập camera
              </p>
              <Button
                onClick={requestPermission}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Camera className="h-4 w-4 mr-2" />
                Cấp quyền ngay
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .scanner-container {
          position: relative;
        }

        #optimized-qr-reader {
          border: none !important;
        }

        #optimized-qr-reader__scan_region {
          position: relative;
          border: 3px solid #10b981 !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }

        /* Scan line animation */
        #optimized-qr-reader__scan_region::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          animation: scan-line 2s linear infinite;
        }

        @keyframes scan-line {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .scan-success-animation {
          animation: pulse-success 0.6s ease-out;
        }

        @keyframes pulse-success {
          0% { 
            border-color: #10b981;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
          }
          50% { 
            border-color: #34d399;
            box-shadow: 0 0 0 12px rgba(16, 185, 129, 0.3),
                        0 0 20px rgba(16, 185, 129, 0.4);
          }
          100% { 
            border-color: #10b981;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
          }
        }

        /* Control panel styling */
        #optimized-qr-reader__dashboard_section_csr {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 12px !important;
          background: linear-gradient(to bottom, #f9fafb, #ffffff) !important;
        }

        #optimized-qr-reader__dashboard_section_csr button {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          color: white !important;
          border: none !important;
          padding: 10px 20px !important;
          border-radius: 10px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          transition: all 0.3s !important;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
        }

        #optimized-qr-reader__dashboard_section_csr button:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4) !important;
        }

        /* Hide camera selection - we don't need it */
        #optimized-qr-reader__camera_selection,
        #optimized-qr-reader__camera_permission_button,
        #optimized-qr-reader__fileio_input {
          display: none !important;
        }

        #optimized-qr-reader video {
          border-radius: 12px !important;
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
        }

        /* Hide unnecessary elements */
        #optimized-qr-reader__status_span,
        #optimized-qr-reader__header_message,
        #html5-qrcode-anchor-scan-type-change,
        #optimized-qr-reader__dashboard_section_swaplink,
        #optimized-qr-reader__dashboard_section_fsr {
          display: none !important;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          #optimized-qr-reader__scan_region {
            border-width: 2px !important;
            border-radius: 8px !important;
          }
          
          #optimized-qr-reader__dashboard_section_csr {
            padding: 8px !important;
          }
          
          #optimized-qr-reader__dashboard_section_csr button {
            padding: 8px 16px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}

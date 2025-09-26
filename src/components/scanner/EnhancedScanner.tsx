'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, CheckCircle, AlertCircle, Focus, ZoomIn, ZoomOut, Shield } from 'lucide-react'
import { getCameraConfig, getOptimalScanSettings, setupAutoFocus } from '@/lib/qr-detection'
import toast from 'react-hot-toast'

interface EnhancedScannerProps {
  onScanSuccess: (result: string) => void
  onScanError?: (error: string) => void
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking' | null

export default function EnhancedScanner({ onScanSuccess, onScanError }: EnhancedScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('checking')
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const lastScanTimeRef = useRef<number>(0)
  const SCAN_COOLDOWN = 2000

  // Check camera permission state
  const checkPermission = useCallback(async () => {
    setPermissionState('checking')
    
    try {
      // Try to check permission using Permissions API
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
          setPermissionState(result.state as PermissionState)
          
          // Listen for permission changes
          result.addEventListener('change', () => {
            setPermissionState(result.state as PermissionState)
          })
          
          return result.state
        } catch (e) {
          // Permissions API not supported for camera
        }
      }
      
      // Fallback: Try to get user media to check permission
      try {
        const config = getCameraConfig()
        const stream = await navigator.mediaDevices.getUserMedia(config)
        
        // Setup auto-focus for desktop cameras
        await setupAutoFocus(stream)
        
        // Success means permission is granted
        stream.getTracks().forEach(track => track.stop())
        setPermissionState('granted')
        return 'granted'
      } catch (error: any) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionState('denied')
          return 'denied'
        } else {
          // Other error, assume prompt is needed
          setPermissionState('prompt')
          return 'prompt'
        }
      }
    } catch {
      // If all checks fail, assume prompt is needed
      setPermissionState('prompt')
      return 'prompt'
    }
  }, [])

  // Handle successful scan
  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now()
    
    if (lastScannedCode === decodedText && (now - lastScanTimeRef.current) < SCAN_COOLDOWN) {
      return
    }
    
    console.log('✅ QR Code detected:', decodedText)
    
    setLastScannedCode(decodedText)
    lastScanTimeRef.current = now
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(200)
    }
    
    // Visual feedback
    const scanRegion = document.querySelector('#enhanced-qr-reader__scan_region')
    if (scanRegion) {
      scanRegion.classList.add('scan-success')
      setTimeout(() => scanRegion.classList.remove('scan-success'), 500)
    }
    
    onScanSuccess(decodedText)
    toast.success('Quét thành công!', { duration: 1500 })
  }, [onScanSuccess, lastScannedCode])

  // Initialize scanner with optimal settings
  const initScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return

    try {
      const scanSettings = getOptimalScanSettings()
      const isDesktop = !(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
      const isMacOS = /Mac OS X/.test(navigator.userAgent)
      
      const config = {
        ...scanSettings,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13
        ],
        verbose: false,
        // Enhanced qrbox configuration
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const size = Math.min(
            isMacOS ? 350 : 300, // Larger scan area for MacOS
            Math.floor(minEdge * 0.85)
          )
          return { width: size, height: size }
        },
        // Additional settings for better detection
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
          // Additional experimental features if available
          ...((window as any).BarcodeDetector ? { nativeBarCodeDetector: true } : {})
        }
      }

      const scanner = new Html5QrcodeScanner(
        'enhanced-qr-reader',
        config as any,
        false
      )

      scanner.render(
        handleScanSuccess,
        (error) => {
          if (!error.includes('NotFoundException') && 
              !error.includes('No MultiFormat Readers')) {
            console.warn('Scan error:', error)
            
            // Check if it's a permission error
            if (error.includes('NotAllowedError') || 
                error.includes('Permission denied') ||
                error.includes('Permission dismissed')) {
              setPermissionState('denied')
              setIsScanning(false)
              toast.error('Camera bị từ chối. Vui lòng cấp quyền trong cài đặt.')
            }
          }
        }
      )

      scannerRef.current = scanner
      setIsScanning(true)
      
      // Show tips for MacOS desktop users only (not iOS)
      if (isMacOS && isDesktop) {
        setTimeout(() => {
          toast('💡 Mẹo: Giữ QR code cách camera 20-30cm và đảm bảo đủ ánh sáng', {
            duration: 4000,
            id: 'macbook-tip' // Use ID to prevent duplicate toasts
          })
        }, 1000)
      }
      
    } catch (error: any) {
      console.error('Scanner init error:', error)
      
      // Check if it's a permission error
      if (error.message?.includes('NotAllowedError') || 
          error.message?.includes('Permission denied')) {
        setPermissionState('denied')
        toast.error('Camera bị từ chối. Vui lòng cấp quyền trong cài đặt.')
      } else {
        toast.error('Không thể khởi động camera. Vui lòng thử lại.')
      }
      
      setIsScanning(false)
    }
  }, [handleScanSuccess])

  // Stop scanner
  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
    setIsScanning(false)
    setZoomLevel(1)
    setLastScannedCode(null)
  }, [])

  // Request permission and start scanner
  const requestPermissionAndStart = useCallback(async () => {
    setIsRequestingPermission(true)

    try {
      const config = getCameraConfig()
      const stream = await navigator.mediaDevices.getUserMedia(config)

      // Setup auto-focus for desktop cameras
      await setupAutoFocus(stream)

      // Permission granted, stop the test stream
      stream.getTracks().forEach(track => track.stop())

      setPermissionState('granted')

      // Start scanner
      await initScanner()
    } catch (error: any) {
      console.error('Permission error:', error)

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState('denied')
        toast.error('Camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('Không tìm thấy camera trên thiết bị này')
        setPermissionState('denied')
      } else {
        toast.error('Không thể kết nối camera. Vui lòng thử lại.')
        setPermissionState('prompt')
      }
    } finally {
      setIsRequestingPermission(false)
    }
  }, [initScanner])

  // Toggle scanner
  const toggleScanner = useCallback(async () => {
    if (isScanning) {
      stopScanner()
    } else {
      // Check permission first
      const permission = await checkPermission()
      
      if (permission === 'granted') {
        await initScanner()
      } else if (permission === 'prompt') {
        await requestPermissionAndStart()
      } else if (permission === 'denied') {
        toast.error('Camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.', {
          duration: 4000
        })
      }
    }
  }, [isScanning, stopScanner, initScanner, checkPermission, requestPermissionAndStart])

  // Adjust zoom (for desktop cameras)
  const adjustZoom = useCallback((delta: number) => {
    const newZoom = Math.max(1, Math.min(3, zoomLevel + delta))
    setZoomLevel(newZoom)
    
    // Apply zoom to video element
    const video = document.querySelector('#enhanced-qr-reader video') as HTMLVideoElement
    if (video) {
      video.style.transform = `scale(${newZoom})`
    }
  }, [zoomLevel])

  // Check permission on mount
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // Cleanup
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  const isMacOS = /Mac OS X/.test(navigator.userAgent)
  const isDesktop = !(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isScanning ? (
            <Button
              onClick={toggleScanner}
              disabled={isRequestingPermission || permissionState === 'checking'}
              className={
                permissionState === 'denied' 
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              <Camera className="h-4 w-4 mr-2" />
              {isRequestingPermission ? 'Đang xin quyền...' : 
               permissionState === 'checking' ? 'Đang kiểm tra...' :
               permissionState === 'denied' ? 'Cài đặt camera' : 
               'Bắt đầu quét'}
            </Button>
          ) : (
            <Button
              onClick={stopScanner}
              variant="destructive"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Dừng quét
            </Button>
          )}

          {isScanning && (
            <div className="flex items-center gap-1 text-green-600 animate-pulse">
              <div className="h-2 w-2 bg-green-600 rounded-full animate-ping" />
              <span className="text-xs font-medium">Đang quét...</span>
            </div>
          )}

          {/* Zoom controls for desktop */}
          {isScanning && isDesktop && (
            <div className="flex items-center gap-1 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => adjustZoom(-0.2)}
                disabled={zoomLevel <= 1}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-600 mx-2">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => adjustZoom(0.2)}
                disabled={zoomLevel >= 3}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {lastScannedCode && (
          <div className="text-xs text-gray-600">
            Vừa quét: <span className="font-mono font-semibold">{lastScannedCode}</span>
          </div>
        )}
      </div>

      {/* Scanner Area */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-inner" 
           style={{ 
             minHeight: isDesktop ? '450px' : '350px',
             maxHeight: isDesktop ? '550px' : '400px'
           }}>
        <div id="enhanced-qr-reader" ref={containerRef} className="w-full" />

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="text-center p-6 max-w-md">
              {permissionState === 'checking' ? (
                <>
                  <div className="h-16 w-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Đang kiểm tra quyền camera...
                  </p>
                </>
              ) : permissionState === 'denied' ? (
                <>
                  <Shield className="h-16 w-16 text-red-500 mx-auto mb-3" />
                  <p className="text-red-700 font-medium mb-2">
                    Camera bị chặn
                  </p>
                  <p className="text-red-600 text-sm">
                    Vui lòng cấp quyền camera trong cài đặt trình duyệt
                  </p>
                </>
              ) : permissionState === 'prompt' ? (
                <>
                  <AlertCircle className="h-16 w-16 text-blue-500 mx-auto mb-3" />
                  <p className="text-blue-700 font-medium mb-2">
                    Cần quyền camera
                  </p>
                  <p className="text-blue-600 text-sm">
                    Nhấn "Bắt đầu quét" và cho phép khi được hỏi
                  </p>
                </>
              ) : (
                <>
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-gray-600 font-medium">
                    Sẵn sàng quét mã QR
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Nhấn "Bắt đầu quét" để kích hoạt camera
                  </p>
                  {isMacOS && (
                    <p className="text-xs text-gray-500 mt-3">
                      💡 MacBook camera: Giữ QR code cách 20-30cm
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Focus indicator for desktop */}
        {isScanning && isDesktop && (
          <div className="absolute top-4 right-4 bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2">
            <Focus className="h-4 w-4 text-green-600 animate-pulse" />
            <span className="text-xs text-gray-700">Auto-focus active</span>
          </div>
        )}
      </div>

      <style jsx global>{`
        #enhanced-qr-reader {
          border: none !important;
        }

        #enhanced-qr-reader__scan_region {
          position: relative;
          border: 3px solid #10b981 !important;
          border-radius: 16px !important;
          overflow: hidden;
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1);
        }

        #enhanced-qr-reader__scan_region::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          animation: scan-line 2s linear infinite;
        }

        @keyframes scan-line {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .scan-success {
          animation: pulse-success 0.6s ease-out;
        }

        @keyframes pulse-success {
          0%, 100% { 
            border-color: #10b981;
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1);
          }
          50% { 
            border-color: #34d399;
            box-shadow: 0 0 0 15px rgba(16, 185, 129, 0.3);
          }
        }

        #enhanced-qr-reader__dashboard_section_csr {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 10px !important;
          background: white !important;
        }

        #enhanced-qr-reader__dashboard_section_csr button {
          background-color: #10b981 !important;
          color: white !important;
          border: none !important;
          padding: 10px 20px !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          font-size: 14px !important;
        }

        #enhanced-qr-reader__dashboard_section_csr button:active {
          background-color: #059669 !important;
        }

        #enhanced-qr-reader__dashboard_section_csr select {
          padding: 8px 12px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          font-size: 14px !important;
          background: white !important;
        }

        #enhanced-qr-reader video {
          border-radius: 12px !important;
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
          transition: transform 0.3s ease;
        }

        /* Hide all unnecessary UI elements */
        #enhanced-qr-reader__camera_selection,
        #enhanced-qr-reader__fileio_input,
        #enhanced-qr-reader__status_span,
        #enhanced-qr-reader__header_message,
        #html5-qrcode-anchor-scan-type-change,
        #enhanced-qr-reader__dashboard_section_swaplink,
        #enhanced-qr-reader__dashboard_section_fsr {
          display: none !important;
        }
        
        /* Torch button styling if available */
        #enhanced-qr-reader button[title*="torch"],
        #enhanced-qr-reader button[title*="flash"] {
          background-color: #f59e0b !important;
        }
        
        #enhanced-qr-reader button[title*="torch"]:active,
        #enhanced-qr-reader button[title*="flash"]:active {
          background-color: #d97706 !important;
        }
      `}</style>
    </div>
  )
}

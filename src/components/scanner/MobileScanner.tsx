'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, AlertCircle, Shield, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'

interface MobileScannerProps {
  onScanSuccess: (result: string) => void
  onScanError?: (error: string) => void
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking' | null

export default function MobileScanner({ onScanSuccess, onScanError }: MobileScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('checking')
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const lastScanRef = useRef<{ code: string; time: number } | null>(null)
  const toastShownRef = useRef<boolean>(false)

  // Detect platform
  const getPlatformInfo = useCallback(() => {
    const userAgent = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
    const isAndroid = /Android/i.test(userAgent)
    const isMobile = isIOS || isAndroid
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true
    
    return { isIOS, isAndroid, isMobile, isPWA }
  }, [])

  // Check camera permission state
  const checkPermission = useCallback(async () => {
    setPermissionState('checking')
    
    try {
      // Try to check permission using Permissions API (not available on iOS)
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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false 
        })
        
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

  // Initialize scanner
  const initScanner = useCallback(async () => {
    // Clean up any existing scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear()
        scannerRef.current = null
      } catch (e) {
        console.warn('Error clearing scanner:', e)
      }
    }

    if (!containerRef.current) return

    try {
      const { isIOS, isMobile } = getPlatformInfo()
      
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const qrboxSize = Math.floor(minEdge * 0.7)
          return { 
            width: Math.min(250, qrboxSize), 
            height: Math.min(250, qrboxSize) 
          }
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        aspectRatio: isMobile ? 1.0 : 1.777,
        showTorchButtonIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: !isIOS
        },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      }

      const scanner = new Html5QrcodeScanner(
        'mobile-qr-reader',
        config,
        false
      )

      // Handle scan success
      const handleScanSuccess = (decodedText: string) => {
        const now = Date.now()
        
        // Prevent duplicate scans
        if (lastScanRef.current && 
            lastScanRef.current.code === decodedText && 
            (now - lastScanRef.current.time) < 3000) {
          return
        }
        
        console.log('✅ QR scanned:', decodedText)
        lastScanRef.current = { code: decodedText, time: now }
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(200)
        }
        
        // Show single toast
        if (!toastShownRef.current) {
          toastShownRef.current = true
          toast.success('Quét thành công!', { 
            duration: 2000,
            id: 'scan-success'
          })
          
          setTimeout(() => {
            toastShownRef.current = false
          }, 2000)
        }
        
        onScanSuccess(decodedText)
      }

      // Handle scan error
      const handleScanError = (error: string) => {
        if (!error.includes('NotFoundException') && 
            !error.includes('No MultiFormat Readers') &&
            !error.includes('Failed to decode')) {
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

      scanner.render(handleScanSuccess, handleScanError)
      scannerRef.current = scanner
      setIsScanning(true)
      
      console.log('📸 Scanner started successfully')
    } catch (error: any) {
      console.error('Failed to start scanner:', error)
      
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
  }, [onScanSuccess, getPlatformInfo])

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear()
        scannerRef.current = null
      } catch (error) {
        console.error('Error stopping scanner:', error)
      }
    }
    setIsScanning(false)
    lastScanRef.current = null
    toastShownRef.current = false
  }, [])

  // Request permission and start scanner
  const requestPermissionAndStart = useCallback(async () => {
    setIsRequestingPermission(true)
    
    try {
      // Request permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false
      })
      
      // Permission granted, stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      setPermissionState('granted')
      toast.success('Đã cấp quyền camera!')
      
      // Start scanner
      await initScanner()
    } catch (error: any) {
      console.error('Permission error:', error)
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState('denied')
        const { isPWA, isIOS } = getPlatformInfo()
        
        if (isPWA && isIOS) {
          toast.error('Vui lòng mở Safari, cấp quyền camera, sau đó thêm lại vào màn hình chính', {
            duration: 6000
          })
        } else if (isIOS) {
          toast.error('Vui lòng cấp quyền camera trong Cài đặt > Safari > Camera', {
            duration: 5000
          })
        } else {
          toast.error('Vui lòng cấp quyền camera trong cài đặt trình duyệt', {
            duration: 4000
          })
        }
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('Không tìm thấy camera trên thiết bị này')
      } else {
        toast.error('Không thể truy cập camera. Vui lòng thử lại.')
      }
    } finally {
      setIsRequestingPermission(false)
    }
  }, [initScanner, getPlatformInfo])

  // Toggle scanner
  const toggleScanner = useCallback(async () => {
    if (isScanning) {
      await stopScanner()
    } else {
      // Check permission first
      const permission = await checkPermission()
      
      if (permission === 'granted') {
        await initScanner()
      } else if (permission === 'prompt') {
        await requestPermissionAndStart()
      } else if (permission === 'denied') {
        const { isPWA, isIOS } = getPlatformInfo()
        
        if (isPWA && isIOS) {
          toast.error('Vui lòng mở Safari, cấp quyền camera, sau đó thêm lại vào màn hình chính', {
            duration: 6000
          })
        } else {
          toast.error('Camera bị từ chối. Vui lòng cấp quyền trong cài đặt.', {
            duration: 4000
          })
        }
      }
    }
  }, [isScanning, stopScanner, initScanner, checkPermission, requestPermissionAndStart, getPlatformInfo])

  // Check permission on mount
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  const { isPWA, isIOS } = getPlatformInfo()

  return (
    <div className="space-y-4">
      {/* Scanner Controls */}
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
            <div className="flex items-center gap-1 text-green-600">
              <div className="h-2 w-2 bg-green-600 rounded-full animate-ping" />
              <span className="text-xs font-medium">Đang quét...</span>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Container */}
      <div 
        className="relative bg-gray-100 rounded-lg overflow-hidden shadow-inner"
        style={{ minHeight: '350px' }}
      >
        <div 
          id="mobile-qr-reader" 
          ref={containerRef} 
          className="w-full"
          style={{ minHeight: '350px' }}
        />

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="text-center p-6 max-w-sm">
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
                  <p className="text-red-600 text-sm mb-4">
                    Ứng dụng cần quyền camera để quét mã QR
                  </p>
                  
                  {/* iOS PWA Instructions */}
                  {isPWA && isIOS && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                      <p className="text-xs text-blue-800 font-medium mb-2">
                        📱 Hướng dẫn cho iPhone/iPad:
                      </p>
                      <ol className="text-xs text-blue-700 space-y-1">
                        <li>1. Mở Safari và truy cập trang web này</li>
                        <li>2. Nhấn "Cho phép" khi được hỏi về camera</li>
                        <li>3. Nhấn nút chia sẻ và chọn "Thêm vào màn hình chính"</li>
                        <li>4. Mở lại app từ màn hình chính</li>
                      </ol>
                    </div>
                  )}
                  
                  {/* iOS Safari Instructions */}
                  {!isPWA && isIOS && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                      <p className="text-xs text-blue-800 font-medium mb-2">
                        🔧 Cách bật camera trên Safari:
                      </p>
                      <ol className="text-xs text-blue-700 space-y-1">
                        <li>1. Vào <b>Cài đặt</b> &gt; <b>Safari</b></li>
                        <li>2. Chọn <b>Camera</b></li>
                        <li>3. Chọn <b>Cho phép</b></li>
                        <li>4. Tải lại trang và thử lại</li>
                      </ol>
                    </div>
                  )}
                  
                  {/* Android Instructions */}
                  {!isIOS && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                      <p className="text-xs text-blue-800 font-medium mb-2">
                        🔧 Cách bật camera:
                      </p>
                      <ol className="text-xs text-blue-700 space-y-1">
                        <li>1. Nhấn vào biểu tượng <b>ℹ️</b> hoặc <b>🔒</b> trên thanh địa chỉ</li>
                        <li>2. Chọn <b>Quyền trang web</b> hoặc <b>Site settings</b></li>
                        <li>3. Bật quyền <b>Camera</b></li>
                        <li>4. Tải lại trang và thử lại</li>
                      </ol>
                    </div>
                  )}
                </>
              ) : permissionState === 'prompt' ? (
                <>
                  <AlertCircle className="h-16 w-16 text-blue-500 mx-auto mb-3" />
                  <p className="text-blue-700 font-medium mb-2">
                    Cần quyền truy cập camera
                  </p>
                  <p className="text-blue-600 text-sm mb-4">
                    Nhấn "Bắt đầu quét" và cho phép camera khi được hỏi
                  </p>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">
                      💡 Khi thông báo hiện ra, chọn <b>"Cho phép"</b> hoặc <b>"Allow"</b>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Sẵn sàng quét mã QR
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Nhấn "Bắt đầu quét" để kích hoạt camera
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Input - Always visible as fallback */}
      <div className="border-t pt-4">
        <p className="text-xs text-gray-600 mb-2 font-medium">
          📝 Nhập mã thủ công nếu không thể quét:
        </p>
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            const input = e.currentTarget.querySelector('input') as HTMLInputElement
            if (input?.value.trim()) {
              onScanSuccess(input.value.trim())
              input.value = ''
              toast.success('Đã nhập mã thành công!')
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Nhập mã tài sản (VD: IT001, LAP002...)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            autoComplete="off"
            autoCapitalize="characters"
          />
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            Xác nhận
          </Button>
        </form>
        
        {/* Help text for manual input */}
        {permissionState === 'denied' && (
          <p className="text-xs text-orange-600 mt-2">
            ⚠️ Camera không khả dụng - Vui lòng nhập mã thủ công
          </p>
        )}
      </div>

      <style jsx global>{`
        #mobile-qr-reader {
          position: relative;
          width: 100%;
          min-height: 350px;
        }

        #mobile-qr-reader > * {
          width: 100% !important;
        }

        #mobile-qr-reader__scan_region {
          border: 2px solid #10b981 !important;
          border-radius: 8px !important;
          background: transparent !important;
        }

        #mobile-qr-reader__scan_region video {
          width: 100% !important;
          height: auto !important;
          border-radius: 8px !important;
          object-fit: cover !important;
        }

        /* Button styling */
        #mobile-qr-reader__dashboard_section_csr {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 10px !important;
          background: white !important;
        }

        #mobile-qr-reader__dashboard_section_csr button {
          background-color: #10b981 !important;
          color: white !important;
          border: none !important;
          padding: 10px 20px !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          font-size: 14px !important;
        }

        #mobile-qr-reader__dashboard_section_csr button:active {
          background-color: #059669 !important;
        }

        /* Camera selection for devices with multiple cameras */
        #mobile-qr-reader__dashboard_section_csr select {
          padding: 8px 12px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          font-size: 14px !important;
          background: white !important;
        }

        /* Hide unnecessary elements */
        #mobile-qr-reader__dashboard_section_fsr,
        #mobile-qr-reader__dashboard_section_swaplink,
        #mobile-qr-reader__header_message,
        #mobile-qr-reader__status_span {
          display: none !important;
        }

        /* Scan animation */
        @keyframes scan-animation {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }

        #mobile-qr-reader__scan_region::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          animation: scan-animation 2s linear infinite;
        }
        
        /* Torch button styling if available */
        #mobile-qr-reader button[title*="torch"],
        #mobile-qr-reader button[title*="flash"] {
          background-color: #f59e0b !important;
        }
        
        #mobile-qr-reader button[title*="torch"]:active,
        #mobile-qr-reader button[title*="flash"]:active {
          background-color: #d97706 !important;
        }
      `}</style>
    </div>
  )
}

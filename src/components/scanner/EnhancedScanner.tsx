'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, AlertCircle, Focus, ZoomIn, ZoomOut, Shield, RotateCcw } from 'lucide-react'
import { getCameraConfig, getOptimalScanSettings, setupAutoFocus } from '@/lib/qr-detection'
import toast from 'react-hot-toast'

interface EnhancedScannerProps {
  onScanSuccess: (result: string) => void
  onScanError?: (error: string) => void
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking' | null

export default function EnhancedScanner({ onScanSuccess }: EnhancedScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('checking')
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const lastScanTimeRef = useRef<number>(0)
  const SCAN_COOLDOWN = 2000

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setCameras(videoDevices)

      // Set default camera (prefer back camera on mobile)
      if (videoDevices.length > 0 && !selectedCameraId) {
        const backCamera = videoDevices.find(camera =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear')
        ) || videoDevices[0]
        setSelectedCameraId(backCamera.deviceId)
      }

      return videoDevices
    } catch (error) {
      console.error('Error getting cameras:', error)
      return []
    }
  }, [selectedCameraId])

  // Check camera permission state and get cameras
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

          if (result.state === 'granted') {
            await getAvailableCameras()
          }

          return result.state
        } catch {
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
        await getAvailableCameras()
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
  }, [getAvailableCameras])

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

  // Initialize scanner with optimal settings and specified camera
  const initScanner = useCallback(async (cameraId?: string) => {
    if (!containerRef.current || scannerRef.current) return

    try {
      const scanSettings = getOptimalScanSettings()
      const isDesktop = !(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
      const isMacOS = /Mac OS X/.test(navigator.userAgent)

      // Get camera configuration
      let cameraConfig: any
      if (cameraId) {
        cameraConfig = cameraId
      } else {
        // Use default camera constraints for best compatibility
        cameraConfig = { facingMode: 'environment' }
      }

      const config = {
        fps: scanSettings.fps,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const size = Math.min(
            isMacOS ? 350 : 300, // Larger scan area for MacOS
            Math.floor(minEdge * 0.85)
          )
          return { width: size, height: size }
        },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }

      console.log('🎥 Initializing scanner with:', {
        cameraId,
        cameraConfig,
        config
      })

      const scanner = new Html5Qrcode('enhanced-qr-reader', {
        formatsToSupport: config.formatsToSupport,
        experimentalFeatures: config.experimentalFeatures,
        verbose: false
      })

      // Start scanning
      await scanner.start(
        cameraConfig,
        config,
        handleScanSuccess,
        (error) => {
          // Ignore common "not found" errors
          if (!error.includes('NotFoundException') &&
              !error.includes('No MultiFormat Readers')) {
            console.warn('Scan error:', error)
          }
        }
      )

      scannerRef.current = scanner
      setIsScanning(true)

      console.log('✅ Scanner started successfully')

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
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (error) {
        console.error('Error stopping scanner:', error)
      }
    }
    setIsScanning(false)
    setZoomLevel(1)
    setLastScannedCode(null)
  }, [])

  // Request permission and start scanner with auto camera selection
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

      // Get available cameras and start with default/selected camera
      await getAvailableCameras()

      // Auto-start scanner with selected camera
      await initScanner(selectedCameraId || undefined)
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
  }, [initScanner, getAvailableCameras, selectedCameraId])

  // Toggle scanner - auto start with camera selection
  const toggleScanner = useCallback(async () => {
    if (isScanning) {
      stopScanner()
    } else {
      // Check permission first
      const permission = await checkPermission()

      if (permission === 'granted') {
        // Auto-start with selected camera
        await initScanner(selectedCameraId || undefined)
      } else if (permission === 'prompt') {
        await requestPermissionAndStart()
      } else if (permission === 'denied') {
        toast.error('Camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.', {
          duration: 4000
        })
      }
    }
  }, [isScanning, stopScanner, initScanner, checkPermission, requestPermissionAndStart, selectedCameraId])

  // Switch camera function
  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return

    const currentIndex = cameras.findIndex(camera => camera.deviceId === selectedCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    const nextCamera = cameras[nextIndex]

    setSelectedCameraId(nextCamera.deviceId)

    // If scanning, restart with new camera
    if (isScanning) {
      await stopScanner()
      setTimeout(() => {
        initScanner(nextCamera.deviceId)
      }, 500) // Small delay to ensure cleanup
    }
  }, [cameras, selectedCameraId, isScanning, stopScanner, initScanner])

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

  // Style the video element
  useEffect(() => {
    if (!isScanning) return

    const styleVideo = () => {
      const video = document.querySelector('#enhanced-qr-reader video') as HTMLVideoElement
      if (video) {
        video.style.borderRadius = '12px'
        video.style.width = '100%'
        video.style.height = 'auto'
        video.style.objectFit = 'cover'
      }
    }

    styleVideo()
    const interval = setInterval(styleVideo, 100)

    return () => clearInterval(interval)
  }, [isScanning])

  // Cleanup
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  const isMacOS = /Mac OS X/.test(navigator.userAgent)
  const isDesktop = !(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))

  return (
    <div className="space-y-1">
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
            <div className="flex items-center gap-2">
              <Button
                onClick={stopScanner}
                variant="destructive"
              >
                <CameraOff className="h-4 w-4 mr-2" />
                Dừng quét
              </Button>

              {/* Simple camera switch icon button */}
              {cameras.length > 1 && (
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0"
                  title="Đổi camera"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
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
      <div className="relative bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200"
           style={{
             minHeight: isDesktop ? '450px' : '350px',
             maxHeight: isDesktop ? '550px' : '400px'
           }}>
        <div id="enhanced-qr-reader" ref={containerRef} className="w-full" />

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
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
          position: relative;
        }

        #enhanced-qr-reader video {
          border-radius: 12px !important;
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
          transition: transform 0.3s ease;
          display: block !important;
        }

        #enhanced-qr-reader canvas {
          display: none !important;
        }

        #enhanced-qr-reader__scan_region {
          position: relative !important;
          border: 3px solid #10b981 !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1) !important;
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
          z-index: 10;
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
            border-color: #10b981 !important;
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1) !important;
          }
          50% {
            border-color: #34d399 !important;
            box-shadow: 0 0 0 15px rgba(16, 185, 129, 0.3) !important;
          }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Camera, 
  CameraOff, 
  CheckCircle, 
  AlertCircle, 
  Search,
  QrCode,
  Keyboard,
  Activity,
  Clock,
  Settings2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatTimeAgo } from '@/lib/utils'

interface ProScannerProps {
  onScanSuccess: (result: string) => void
  onScanError?: (error: string) => void
}

interface RecentScan {
  code: string
  timestamp: Date
  success: boolean
}

export default function ProScanner({ onScanSuccess, onScanError }: ProScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    successRate: 100,
    avgScanTime: 0
  })
  const lastScanTimeRef = useRef<number>(0)
  const scanStartTimeRef = useRef<number>(0)
  
  // Configuration state
  const [config, setConfig] = useState({
    fps: 10,
    qrboxSize: 250,
    aspectRatio: 1.777,
    showTorch: true
  })

  // Check camera permission on mount
  useEffect(() => {
    checkPermission()
  }, [])

  // Check camera permission
  const checkPermission = async () => {
    try {
      // First check if mediaDevices is available
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasPermission(false)
        return false
      }

      // Try to get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      // Stop all tracks to release camera
      stream.getTracks().forEach(track => track.stop())
      
      setHasPermission(true)
      return true
    } catch (error) {
      console.error('Camera permission check failed:', error)
      setHasPermission(false)
      return false
    }
  }

  // Request camera permission
  const requestPermission = async () => {
    const hasAccess = await checkPermission()
    
    if (hasAccess) {
      toast.success('Đã cấp quyền camera')
      startScanner()
    } else {
      toast.error('Vui lòng cấp quyền camera trong cài đặt trình duyệt')
    }
  }

  // Handle successful scan with debouncing
  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now()
    
    // Calculate scan time
    if (scanStartTimeRef.current) {
      const scanTime = now - scanStartTimeRef.current
      setScanStats(prev => ({
        ...prev,
        avgScanTime: Math.round((prev.avgScanTime + scanTime) / 2)
      }))
    }
    
    // Prevent duplicate scans within 2 seconds
    if (now - lastScanTimeRef.current < 2000) {
      return
    }
    
    lastScanTimeRef.current = now
    
    // Add to recent scans
    setRecentScans(prev => [
      { code: decodedText, timestamp: new Date(), success: true },
      ...prev.slice(0, 4)
    ])
    
    // Update stats
    setScanStats(prev => ({
      ...prev,
      totalScans: prev.totalScans + 1
    }))
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
    
    // Visual feedback
    animateScanSuccess()
    
    // Call callback
    onScanSuccess(decodedText)
    
    // Show success notification
    toast.success(
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4" />
        <span>Đã quét: <strong>{decodedText}</strong></span>
      </div>,
      { duration: 2000 }
    )
    
    // Pause scanner briefly
    if (scannerRef.current) {
      const scanner = scannerRef.current as any
      if (scanner.html5Qrcode) {
        scanner.html5Qrcode.pause()
        setTimeout(() => {
          if (scanner.html5Qrcode) {
            scanner.html5Qrcode.resume()
          }
        }, 2000)
      }
    }
  }, [onScanSuccess])

  // Animate scan success
  const animateScanSuccess = () => {
    const scanRegion = document.querySelector('#pro-qr-reader__scan_region')
    if (scanRegion) {
      scanRegion.classList.add('scan-success')
      setTimeout(() => {
        scanRegion.classList.remove('scan-success')
      }, 600)
    }
  }

  // Start scanner
  const startScanner = async () => {
    if (!containerRef.current || scannerRef.current) return
    
    // Check permission first
    const hasAccess = await checkPermission()
    if (!hasAccess) {
      toast.error('Không thể truy cập camera')
      return
    }

    try {
      const qrConfig = {
        fps: config.fps,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Responsive sizing
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const size = Math.min(
            config.qrboxSize,
            Math.floor(minEdge * 0.7)
          )
          
          return { width: size, height: size }
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        aspectRatio: window.innerWidth < 640 ? 1.0 : config.aspectRatio,
        showTorchButtonIfSupported: config.showTorch,
        showZoomSliderIfSupported: false,
        defaultZoomValueIfSupported: 1,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8
        ]
      }

      const scanner = new Html5QrcodeScanner(
        'pro-qr-reader',
        qrConfig,
        false
      )

      scanner.render(
        handleScanSuccess,
        (error) => {
          // Ignore common errors
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
      scanStartTimeRef.current = Date.now()
      
      console.log('📸 Scanner started successfully')
    } catch (error) {
      console.error('Failed to start scanner:', error)
      toast.error('Không thể khởi động máy quét')
      setHasPermission(false)
    }
  }

  // Stop scanner
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
    setIsScanning(false)
    scanStartTimeRef.current = 0
  }

  // Toggle scanner
  const toggleScanner = () => {
    if (isScanning) {
      stopScanner()
    } else {
      startScanner()
    }
  }

  // Handle manual input
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    
    if (code) {
      // Add to recent scans
      setRecentScans(prev => [
        { code, timestamp: new Date(), success: true },
        ...prev.slice(0, 4)
      ])
      
      // Update stats
      setScanStats(prev => ({
        ...prev,
        totalScans: prev.totalScans + 1
      }))
      
      // Call callback
      onScanSuccess(code)
      
      // Clear input
      setManualCode('')
      
      // Show success
      toast.success(`Đã nhập mã: ${code}`)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div className="bg-blue-50 rounded-lg p-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs text-gray-600">Tổng quét</p>
            <p className="font-semibold text-blue-700">{scanStats.totalScans}</p>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-2 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-xs text-gray-600">Tỷ lệ thành công</p>
            <p className="font-semibold text-green-700">{scanStats.successRate}%</p>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-600" />
          <div>
            <p className="text-xs text-gray-600">Thời gian TB</p>
            <p className="font-semibold text-purple-700">{scanStats.avgScanTime}ms</p>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-2 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-orange-600" />
          <div>
            <p className="text-xs text-gray-600">Gần đây</p>
            <p className="font-semibold text-orange-700">{recentScans.length}</p>
          </div>
        </div>
      </div>

      {/* Main Scanner Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              Quét mã QR chuyên nghiệp
            </CardTitle>
            
            {/* Settings button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // Toggle advanced settings
                const newFps = config.fps === 10 ? 15 : 10
                setConfig(prev => ({ ...prev, fps: newFps }))
                toast.success(`FPS: ${newFps}`)
              }}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Scanner Controls */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasPermission === false ? (
                <Button
                  onClick={requestPermission}
                  className="bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Cấp quyền camera
                </Button>
              ) : (
                <Button
                  onClick={toggleScanner}
                  variant={isScanning ? "destructive" : "default"}
                  className={isScanning ? "" : "bg-green-600 hover:bg-green-700"}
                  size="sm"
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
            
            {/* Quick settings */}
            {isScanning && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    const newSize = config.qrboxSize === 250 ? 200 : 250
                    setConfig(prev => ({ ...prev, qrboxSize: newSize }))
                    stopScanner()
                    setTimeout(startScanner, 100)
                  }}
                >
                  {config.qrboxSize}px
                </Button>
              </div>
            )}
          </div>

          {/* Scanner Container */}
          <div className="relative bg-gradient-to-b from-gray-50 to-gray-100" 
               style={{ minHeight: '450px' }}>
            <div id="pro-qr-reader" ref={containerRef} className="w-full" />

            {!isScanning && hasPermission !== false && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="relative inline-block">
                    <QrCode className="h-20 w-20 text-gray-300" />
                    <div className="absolute inset-0 animate-ping">
                      <QrCode className="h-20 w-20 text-gray-200 opacity-75" />
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600 font-medium">
                    Nhấn "Bắt đầu quét" để kích hoạt
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Camera sẽ tự động nhận diện mã QR
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
                  <p className="text-orange-600 text-sm mb-4">
                    Ứng dụng cần quyền camera để quét mã QR
                  </p>
                  <Button
                    onClick={requestPermission}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Cho phép truy cập
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-blue-600" />
            Nhập thủ công
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Nhập mã tài sản..."
              className="flex-1"
            />
            <Button type="submit" disabled={!manualCode.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quét gần đây</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentScans.map((scan, index) => (
                <div
                  key={`${scan.code}-${index}`}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                >
                  <span className="font-mono font-semibold">{scan.code}</span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(scan.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <style jsx global>{`
        #pro-qr-reader {
          border: none !important;
        }

        #pro-qr-reader__scan_region {
          position: relative;
          border: 3px solid #10b981 !important;
          border-radius: 16px !important;
          overflow: hidden;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }

        #pro-qr-reader__scan_region::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -100%;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, 
            transparent, 
            #10b981, 
            #10b981,
            transparent
          );
          animation: scan-line 2s linear infinite;
        }

        @keyframes scan-line {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        #pro-qr-reader__scan_region.scan-success {
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

        /* Corner indicators */
        #pro-qr-reader__scan_region::after {
          content: '';
          position: absolute;
          inset: -1px;
          background: conic-gradient(
            from 0deg at 20px 20px,
            #10b981 0deg,
            transparent 0deg 90deg,
            #10b981 90deg
          );
          mask: 
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
          padding: 20px;
          pointer-events: none;
        }

        #pro-qr-reader__dashboard_section_csr {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 12px !important;
          background: linear-gradient(to bottom, #f9fafb, #ffffff) !important;
        }

        #pro-qr-reader__dashboard_section_csr button {
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

        #pro-qr-reader__dashboard_section_csr button:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4) !important;
        }

        #pro-qr-reader__dashboard_section_csr button:active {
          transform: translateY(0) !important;
        }

        #pro-qr-reader__camera_selection {
          padding: 10px 14px !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          background: white !important;
          min-width: 200px !important;
          transition: all 0.2s !important;
        }

        #pro-qr-reader__camera_selection:focus {
          outline: none !important;
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
        }

        #pro-qr-reader video {
          border-radius: 12px !important;
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
        }

        /* Hide unnecessary elements */
        #pro-qr-reader__status_span,
        #pro-qr-reader__header_message,
        #html5-qrcode-anchor-scan-type-change,
        #pro-qr-reader__dashboard_section_swaplink,
        #pro-qr-reader__scan_region img {
          display: none !important;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          #pro-qr-reader__scan_region {
            border-width: 2px !important;
            border-radius: 12px !important;
          }
          
          #pro-qr-reader__dashboard_section_csr {
            padding: 8px !important;
          }
          
          #pro-qr-reader__dashboard_section_csr button {
            padding: 8px 16px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}

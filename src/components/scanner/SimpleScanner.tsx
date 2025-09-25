import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { throttle } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, CheckCircle } from 'lucide-react'

interface ScannerProps {
  onScanSuccess: (result: string) => void
  onScanError?: (error: string) => void
}

export default function SimpleScanner({ onScanSuccess, onScanError }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)

  // Throttle scan success to prevent multiple rapid scans
  const throttledSuccess = useRef(
    throttle((decodedText: string) => {
      onScanSuccess(decodedText)
    }, 2000)
  ).current

  const startScanner = () => {
    if (!containerRef.current || scannerRef.current) return

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    }

    const scanner = new Html5QrcodeScanner(
      'simple-qr-reader',
      config,
      false // verbose
    )

    scanner.render(
      (decodedText) => {
        console.log('QR Scanned:', decodedText)
        throttledSuccess(decodedText)
      },
      (error) => {
        // Ignore common scanning errors
        if (!error.includes('NotFoundException') &&
            !error.includes('No barcode or QR code detected')) {
          console.warn('Scan error:', error)
          onScanError?.(error)
        }
      }
    )

    scannerRef.current = scanner
    setIsScanning(true)
    setPermissionGranted(true)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const toggleScanner = () => {
    if (isScanning) {
      stopScanner()
    } else {
      startScanner()
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
      {/* Scanner Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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

          {isScanning && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Đang quét...</span>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Area */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
        <div id="simple-qr-reader" ref={containerRef} className="w-full"></div>

        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                Nhấn "Bắt đầu quét" để kích hoạt camera
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        #simple-qr-reader {
          border: none !important;
        }

        #simple-qr-reader__scan_region {
          border: 2px solid #10b981 !important;
          border-radius: 8px;
        }

        #simple-qr-reader__dashboard_section_csr button {
          background-color: #10b981 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 6px !important;
          font-weight: 600 !important;
        }

        #simple-qr-reader__dashboard_section_csr button:hover {
          background-color: #059669 !important;
        }

        #simple-qr-reader__dashboard_section_csr select {
          padding: 8px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
        }

        #simple-qr-reader__status_span {
          color: #6b7280 !important;
          font-size: 14px !important;
        }

        #simple-qr-reader video {
          border-radius: 8px;
        }
      `}</style>
    </div>
  )
}
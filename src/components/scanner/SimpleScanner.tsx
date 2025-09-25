import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { throttle } from '@/lib/utils'

interface ScannerProps {
  onScanSuccess: (result: string) => void
  onScanError?: (error: string) => void
}

export default function SimpleScanner({ onScanSuccess, onScanError }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Throttle scan success to prevent multiple rapid scans
  const throttledSuccess = useRef(
    throttle((decodedText: string) => {
      onScanSuccess(decodedText)
    }, 2000)
  ).current

  useEffect(() => {
    if (!containerRef.current) return

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
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
        throttledSuccess(decodedText)
      },
      (error) => {
        // Ignore common errors
        if (!error.includes('NotFoundException')) {
          console.error('Scan error:', error)
          onScanError?.(error)
        }
      }
    )

    scannerRef.current = scanner

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [throttledSuccess, onScanError])

  return (
    <div>
      <div id="simple-qr-reader" ref={containerRef} className="w-full"></div>

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
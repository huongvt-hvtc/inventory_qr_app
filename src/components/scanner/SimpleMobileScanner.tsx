'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface SimpleMobileScannerProps {
  onScanSuccess: (result: string) => void
}

export default function SimpleMobileScanner({ onScanSuccess }: SimpleMobileScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  // Import jsQR dynamically
  const scanQRCode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.videoWidth === 0) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    try {
      // Use jsQR to detect QR code
      const jsQR = (await import('jsqr')).default
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      if (code) {
        console.log('QR Code found:', code.data)
        onScanSuccess(code.data)
        toast.success('QR Code detected!', { duration: 1500 })
      }
    } catch (error) {
      console.error('QR detection error:', error)
    }
  }, [onScanSuccess])

  const startCamera = useCallback(async () => {
    setError(null)
    setDebugInfo('Starting camera...')
    
    try {
      // Simple camera constraints for mobile
      const constraints = {
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false
      }

      setDebugInfo('Requesting camera permission...')
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      setDebugInfo('Camera permission granted')
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        // Don't call play() immediately, let onloadedmetadata handle it
        
        videoRef.current.onloadedmetadata = () => {
          const video = videoRef.current
          setDebugInfo(`Video metadata loaded: ${video?.videoWidth}x${video?.videoHeight}, readyState: ${video?.readyState}`)
          
          // Try to play video explicitly
          video?.play().then(() => {
            setDebugInfo(`Video playing: ${video?.videoWidth}x${video?.videoHeight}`)
            setIsScanning(true)
            setError(null)
          }).catch(playError => {
            console.error('Video play error:', playError)
            setError(`Video play failed: ${playError.message}`)
            setDebugInfo(`Play error: ${playError.name} - ${playError.message}`)
          })
        }

        videoRef.current.onloadstart = () => {
          setDebugInfo('Video loading started...')
        }

        videoRef.current.oncanplay = () => {
          setDebugInfo('Video can start playing')
        }

        videoRef.current.onplaying = () => {
          setDebugInfo(`Video is playing: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`)
        }

        videoRef.current.onpause = () => {
          setDebugInfo('Video paused')
        }

        videoRef.current.onended = () => {
          setDebugInfo('Video ended')
        }

        videoRef.current.onerror = (e) => {
          console.error('Video error:', e)
          const video = e.target as HTMLVideoElement
          setError(`Video error: ${video.error?.code} - ${video.error?.message}`)
          setDebugInfo(`Video error: code ${video.error?.code}, message: ${video.error?.message}`)
        }
      }

    } catch (err: any) {
      console.error('Camera error:', err)
      
      let errorMessage = 'Unknown camera error'
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints not supported.'
      } else {
        errorMessage = err.message || 'Camera initialization failed'
      }
      
      setError(errorMessage)
      setDebugInfo(`Error: ${err.name} - ${err.message}`)
      setIsScanning(false)
    }
  }, [])

  const stopCamera = useCallback((reason?: string) => {
    console.log('stopCamera called:', reason || 'manual')
    setDebugInfo(`Camera stopped: ${reason || 'manual stop'}`)
    
    if (stream) {
      console.log('Stopping stream tracks:', stream.getTracks().length)
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.readyState)
        track.stop()
      })
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }, [stream])

  // Scanning loop
  useEffect(() => {
    if (!isScanning) return

    const intervalId = setInterval(() => {
      scanQRCode()
    }, 500) // Scan every 500ms

    return () => clearInterval(intervalId)
  }, [isScanning, scanQRCode])

  // Cleanup on unmount - remove dependency to prevent re-runs
  useEffect(() => {
    return () => {
      console.log('Component unmounting, stopping camera')
      // Direct cleanup without calling stopCamera to avoid dependency loop
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isScanning ? (
            <Button
              onClick={startCamera}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <Button
              onClick={() => stopCamera('user stop')}
              variant="destructive"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Camera
            </Button>
          )}

          {isScanning && (
            <div className="flex items-center gap-1 text-green-600">
              <div className="h-2 w-2 bg-green-600 rounded-full animate-ping" />
              <span className="text-xs font-medium">Scanning...</span>
            </div>
          )}
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
          Debug: {debugInfo}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Camera View */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"

        />
        
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 border-2 border-green-500 rounded-lg">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-green-400 w-64 h-64 rounded-lg">
              <div className="absolute inset-0 border-2 border-green-300 rounded-lg animate-pulse" />
            </div>
          </div>
        )}

        {/* Canvas for QR detection (hidden) */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Placeholder when not scanning */}
        {!isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <Camera className="h-16 w-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Tap "Start Camera" to begin scanning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

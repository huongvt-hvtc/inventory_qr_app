// Enhanced QR detection utilities for better desktop camera support
import jsQR from 'jsqr'

// Process video frame for better QR detection
export function enhanceVideoFrame(video: HTMLVideoElement): ImageData | null {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) return null
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw and process frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Apply image enhancement for better detection
    enhanceImageData(imageData)
    
    return imageData
  } catch (error) {
    console.error('Error enhancing video frame:', error)
    return null
  }
}

// Enhance image data for better QR detection
function enhanceImageData(imageData: ImageData): void {
  const data = imageData.data
  
  // Apply contrast and brightness adjustments
  for (let i = 0; i < data.length; i += 4) {
    // Get RGB values
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]
    
    // Convert to grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    
    // Apply contrast enhancement
    const contrast = 1.5
    const enhanced = ((gray - 128) * contrast) + 128
    
    // Apply threshold for better black/white separation
    const threshold = enhanced > 127 ? 255 : 0
    
    // Set enhanced values
    data[i] = threshold
    data[i + 1] = threshold
    data[i + 2] = threshold
  }
}

// Try to detect QR code using jsQR as fallback
export function detectQRWithJsQR(video: HTMLVideoElement): string | null {
  try {
    const imageData = enhanceVideoFrame(video)
    
    if (!imageData) return null
    
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    })
    
    if (code && code.data) {
      return code.data
    }
    
    return null
  } catch (error) {
    console.error('jsQR detection error:', error)
    return null
  }
}

// Camera configuration for different devices
export function getCameraConfig() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isMacOS = /Mac OS X/.test(navigator.userAgent)
  const isWindows = /Windows/.test(navigator.userAgent)
  
  if (isMobile) {
    return {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.777 }
      },
      audio: false
    }
  }
  
  if (isMacOS) {
    // MacBook cameras often need different settings
    return {
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        aspectRatio: { ideal: 1.333 }, // 4:3 for most MacBook cameras
        frameRate: { ideal: 30, max: 30 },
        // Advanced settings for better focus
        advanced: [
          { focusMode: 'continuous' },
          { exposureMode: 'continuous' },
          { whiteBalanceMode: 'continuous' }
        ]
      },
      audio: false
    }
  }
  
  // Default for Windows and others
  return {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      aspectRatio: { ideal: 1.777 },
      frameRate: { ideal: 30 }
    },
    audio: false
  }
}

// Auto-focus helper for desktop cameras
export async function setupAutoFocus(stream: MediaStream): Promise<void> {
  try {
    const videoTrack = stream.getVideoTracks()[0]
    const capabilities = videoTrack.getCapabilities?.() as any
    
    if (capabilities?.focusMode?.includes('continuous')) {
      await videoTrack.applyConstraints({
        advanced: [{ focusMode: 'continuous' } as any]
      })
      console.log('Auto-focus enabled')
    }
    
    if (capabilities?.exposureMode?.includes('continuous')) {
      await videoTrack.applyConstraints({
        advanced: [{ exposureMode: 'continuous' } as any]
      })
      console.log('Auto-exposure enabled')
    }
  } catch (error) {
    console.warn('Could not setup auto-focus:', error)
  }
}

// Scan settings optimizer based on device
export function getOptimalScanSettings() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isMacOS = /Mac OS X/.test(navigator.userAgent)
  
  if (isMobile) {
    return {
      fps: 10,
      qrbox: 250,
      aspectRatio: 1.0,
      disableFlip: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    }
  }
  
  if (isMacOS) {
    // Higher FPS for desktop processing power
    return {
      fps: 15,
      qrbox: 300,
      aspectRatio: 1.333, // 4:3 for MacBook cameras
      disableFlip: false,
      showZoomSliderIfSupported: true, // Allow zoom on desktop
      defaultZoomValueIfSupported: 1.2, // Slight zoom for better detection
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    }
  }
  
  // Default desktop settings
  return {
    fps: 15,
    qrbox: 300,
    aspectRatio: 1.777,
    disableFlip: false,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    }
  }
}

// Test camera and provide diagnostics
export async function testCameraQuality(): Promise<{
  hasCamera: boolean
  cameraName: string
  resolution: string
  canAutoFocus: boolean
  recommendation: string
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getCameraConfig())
    const videoTrack = stream.getVideoTracks()[0]
    const settings = videoTrack.getSettings()
    const capabilities = videoTrack.getCapabilities?.() as any
    
    const result = {
      hasCamera: true,
      cameraName: videoTrack.label || 'Unknown Camera',
      resolution: `${settings.width}x${settings.height}`,
      canAutoFocus: capabilities?.focusMode?.includes('continuous') || false,
      recommendation: ''
    }
    
    // Provide recommendations
    if (settings.width && settings.width < 640) {
      result.recommendation = 'Camera resolution too low. QR scanning may be difficult.'
    } else if (!result.canAutoFocus) {
      result.recommendation = 'Camera does not support auto-focus. Hold QR code steady at fixed distance.'
    } else {
      result.recommendation = 'Camera settings optimal for QR scanning.'
    }
    
    // Clean up
    stream.getTracks().forEach(track => track.stop())
    
    return result
  } catch (error) {
    return {
      hasCamera: false,
      cameraName: 'No camera detected',
      resolution: 'N/A',
      canAutoFocus: false,
      recommendation: 'Camera not accessible. Please check permissions.'
    }
  }
}

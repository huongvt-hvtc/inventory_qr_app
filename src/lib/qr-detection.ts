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
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
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
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)

  if (isMobile) {
    if (isIOS) {
      // iOS specific settings for better compatibility
      return {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 20, max: 30 }
        },
        audio: false
      }
    } else if (isAndroid) {
      // Android specific settings
      return {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 720, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 25, max: 30 }
        },
        audio: false
      }
    } else {
      // Fallback mobile settings
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
  }

  if (isMacOS) {
    // MacBook cameras optimized settings
    return {
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        aspectRatio: { ideal: 4/3 }, // Most MacBook cameras are 4:3
        frameRate: { ideal: 30, max: 30 },
        facingMode: { ideal: 'user' } // MacBooks typically use front camera
      },
      audio: false
    }
  }

  // Default for Windows and other desktop systems
  return {
    video: {
      width: { ideal: 1280, min: 640, max: 1920 },
      height: { ideal: 720, min: 480, max: 1080 },
      aspectRatio: { ideal: 16/9 },
      frameRate: { ideal: 30, max: 60 }
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
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isDesktop = !isMobile

  if (isMobile) {
    if (isIOS) {
      // iOS optimized settings
      return {
        fps: 10, // Lower FPS for better performance on iOS
        qrbox: 280,
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false // iOS has issues with this
        }
      }
    } else if (isAndroid) {
      // Android optimized settings
      return {
        fps: 12,
        qrbox: 300,
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Works better on Android
        }
      }
    } else {
      // Fallback mobile settings
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
  }

  if (isMacOS) {
    // MacBook optimized settings
    return {
      fps: 20, // Higher FPS for desktop processing power
      qrbox: 350,
      aspectRatio: 4/3, // 4:3 for MacBook cameras
      disableFlip: false,
      rememberLastUsedCamera: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 1.0,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    }
  }

  // Default desktop settings (Windows, Linux, etc.)
  return {
    fps: 25, // High FPS for desktop
    qrbox: 400,
    aspectRatio: 16/9,
    disableFlip: false,
    rememberLastUsedCamera: true,
    showZoomSliderIfSupported: true,
    defaultZoomValueIfSupported: 1.0,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    }
  }
}

// Enhanced error handling utilities
export function getCameraErrorMessage(error: any): string {
  const errorName = error.name || error.message || 'Unknown error'
  const userAgent = navigator.userAgent
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true

  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      if (isPWA && isIOS) {
        return 'Vui lòng mở Safari, cấp quyền camera, sau đó thêm lại vào màn hình chính'
      } else if (isIOS) {
        return 'Vui lòng cấp quyền camera trong Cài đặt > Safari > Camera'
      } else if (isMobile) {
        return 'Vui lòng cấp quyền camera trong cài đặt trình duyệt'
      } else {
        return 'Vui lòng cấp quyền camera bằng cách nhấn vào biểu tượng khóa/thông tin trên thanh địa chỉ'
      }

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Không tìm thấy camera trên thiết bị này'

    case 'NotReadableError':
      return 'Camera đang được sử dụng bởi ứng dụng khác'

    case 'OverconstrainedError':
      return 'Camera không hỗ trợ cài đặt yêu cầu'

    case 'SecurityError':
      return 'Truy cập camera bị chặn vì lý do bảo mật'

    case 'AbortError':
      return 'Yêu cầu camera bị hủy'

    default:
      return 'Lỗi không xác định khi truy cập camera'
  }
}

// Check camera permissions
export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    // Try Permissions API first
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
        return result.state as 'granted' | 'denied' | 'prompt'
      } catch (e) {
        // Permissions API not supported for camera
      }
    }

    // Fallback: Try to get user media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.getTracks().forEach(track => track.stop())
      return 'granted'
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return 'denied'
      } else {
        return 'prompt'
      }
    }
  } catch {
    return 'unknown'
  }
}

// Get available cameras
export async function getAvailableCameras(): Promise<{
  cameras: MediaDeviceInfo[]
  hasBackCamera: boolean
  hasFrontCamera: boolean
}> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter(device => device.kind === 'videoinput')

    const hasBackCamera = cameras.some(camera =>
      camera.label.toLowerCase().includes('back') ||
      camera.label.toLowerCase().includes('rear') ||
      camera.label.toLowerCase().includes('environment')
    )

    const hasFrontCamera = cameras.some(camera =>
      camera.label.toLowerCase().includes('front') ||
      camera.label.toLowerCase().includes('user') ||
      camera.label.toLowerCase().includes('selfie')
    )

    return {
      cameras,
      hasBackCamera,
      hasFrontCamera
    }
  } catch (error) {
    return {
      cameras: [],
      hasBackCamera: false,
      hasFrontCamera: false
    }
  }
}

// Test camera and provide diagnostics
export async function testCameraQuality(): Promise<{
  hasCamera: boolean
  cameraName: string
  resolution: string
  canAutoFocus: boolean
  hasTorch: boolean
  deviceType: string
  recommendation: string
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getCameraConfig())
    const videoTrack = stream.getVideoTracks()[0]
    const settings = videoTrack.getSettings()
    const capabilities = videoTrack.getCapabilities?.() as any

    const userAgent = navigator.userAgent
    const deviceType = /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS' :
                      /Android/i.test(userAgent) ? 'Android' :
                      /Mac OS X/i.test(userAgent) ? 'macOS' : 'Desktop'

    const result = {
      hasCamera: true,
      cameraName: videoTrack.label || 'Unknown Camera',
      resolution: `${settings.width}x${settings.height}`,
      canAutoFocus: capabilities?.focusMode?.includes('continuous') || false,
      hasTorch: capabilities?.torch === true,
      deviceType,
      recommendation: ''
    }

    // Provide recommendations based on device and capabilities
    if (settings.width && settings.width < 640) {
      result.recommendation = 'Camera resolution thấp. QR scanning có thể khó khăn. Thử giữ QR code gần camera hơn.'
    } else if (!result.canAutoFocus && deviceType === 'macOS') {
      result.recommendation = 'Camera không hỗ trợ auto-focus. Giữ QR code cách camera 20-30cm và không di chuyển.'
    } else if (deviceType === 'iOS' && !result.hasTorch) {
      result.recommendation = 'Camera tốt cho QR scanning. Sử dụng đèn flash nếu thiếu sáng.'
    } else if (deviceType === 'Android' && result.hasTorch) {
      result.recommendation = 'Camera tối ưu với đèn flash. Sẵn sàng cho QR scanning trong mọi điều kiện ánh sáng.'
    } else {
      result.recommendation = 'Camera hoạt động tốt cho QR scanning.'
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
      hasTorch: false,
      deviceType: 'Unknown',
      recommendation: getCameraErrorMessage(error)
    }
  }
}

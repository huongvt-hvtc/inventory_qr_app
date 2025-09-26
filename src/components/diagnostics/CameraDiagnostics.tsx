'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, CheckCircle, XCircle, AlertCircle, Info, Smartphone, Monitor } from 'lucide-react'
import { testCameraQuality, getAvailableCameras, checkCameraPermission } from '@/lib/qr-detection'

interface CameraInfo {
  hasCamera: boolean
  cameraName: string
  resolution: string
  canAutoFocus: boolean
  hasTorch: boolean
  deviceType: string
  recommendation: string
}

export default function CameraDiagnostics() {
  const [isLoading, setIsLoading] = useState(false)
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null)
  const [availableCameras, setAvailableCameras] = useState<{
    cameras: MediaDeviceInfo[]
    hasBackCamera: boolean
    hasFrontCamera: boolean
  } | null>(null)
  const [permissionState, setPermissionState] = useState<string>('')

  const runDiagnostics = async () => {
    setIsLoading(true)

    try {
      // Run all diagnostics in parallel
      const [cameraTest, cameras, permission] = await Promise.all([
        testCameraQuality(),
        getAvailableCameras(),
        checkCameraPermission()
      ])

      setCameraInfo(cameraTest)
      setAvailableCameras(cameras)
      setPermissionState(permission)
    } catch (error) {
      console.error('Diagnostic error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics()
  }, [])

  const getPermissionStatusIcon = () => {
    switch (permissionState) {
      case 'granted':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'prompt':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getPermissionStatusText = () => {
    switch (permissionState) {
      case 'granted':
        return 'Đã cấp quyền'
      case 'denied':
        return 'Bị từ chối'
      case 'prompt':
        return 'Chờ xác nhận'
      default:
        return 'Không xác định'
    }
  }

  const getDeviceIcon = () => {
    if (!cameraInfo) return <Monitor className="h-5 w-5 text-gray-500" />

    switch (cameraInfo.deviceType) {
      case 'iOS':
      case 'Android':
        return <Smartphone className="h-5 w-5 text-blue-600" />
      default:
        return <Monitor className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Trạng thái hệ thống camera</span>
            <Button
              onClick={runDiagnostics}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? 'Đang kiểm tra...' : 'Chạy lại'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Đang kiểm tra camera...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Permission Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getPermissionStatusIcon()}
                  <span className="font-medium">Quyền Camera:</span>
                </div>
                <span className="text-sm text-gray-600">
                  {getPermissionStatusText()}
                </span>
              </div>

              {/* Camera Info */}
              {cameraInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      {getDeviceIcon()}
                      <span className="font-medium">Thiết bị:</span>
                      <span>{cameraInfo.deviceType}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      {cameraInfo.hasCamera ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">Camera:</span>
                      <span>{cameraInfo.cameraName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Độ phân giải:</span>
                      <span>{cameraInfo.resolution}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      {cameraInfo.canAutoFocus ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="font-medium">Auto-focus:</span>
                      <span>{cameraInfo.canAutoFocus ? 'Có' : 'Không'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      {cameraInfo.hasTorch ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="font-medium">Đèn flash:</span>
                      <span>{cameraInfo.hasTorch ? 'Có' : 'Không'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Cameras */}
              {availableCameras && availableCameras.cameras.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-2">Camera có sẵn ({availableCameras.cameras.length}):</h4>
                  <div className="space-y-2">
                    {availableCameras.cameras.map((camera, index) => (
                      <div key={camera.deviceId} className="text-sm text-gray-600 flex items-center gap-2">
                        <Camera className="h-3 w-3" />
                        <span>{camera.label || `Camera ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Camera sau: {availableCameras.hasBackCamera ? '✓' : '✗'}</span>
                    <span>Camera trước: {availableCameras.hasFrontCamera ? '✓' : '✗'}</span>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {cameraInfo?.recommendation && (
                <div className={`p-3 rounded-lg ${
                  cameraInfo.hasCamera
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <Info className={`h-4 w-4 mt-0.5 ${
                      cameraInfo.hasCamera ? 'text-blue-600' : 'text-orange-600'
                    }`} />
                    <p className={`text-sm ${
                      cameraInfo.hasCamera ? 'text-blue-800' : 'text-orange-800'
                    }`}>
                      <strong>Khuyến nghị:</strong> {cameraInfo.recommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
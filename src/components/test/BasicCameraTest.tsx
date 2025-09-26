'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function BasicCameraTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const testCamera = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Testing basic camera access...')
      console.log('Current URL:', window.location.href)
      console.log('Protocol:', window.location.protocol)
      console.log('Is secure context:', window.isSecureContext)

      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not available. This usually happens when the site is not served over HTTPS (except localhost). Please access the app via https://localhost:3001 or http://localhost:3001')
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })

      console.log('✅ Camera access successful!')
      console.log('Stream:', mediaStream)
      console.log('Video tracks:', mediaStream.getVideoTracks())

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        console.log('✅ Video playing')
      }

    } catch (err: any) {
      console.error('❌ Camera test failed:', err)
      console.error('Error name:', err.name)
      console.error('Error message:', err.message)
      setError(`${err.name}: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track)
        track.stop()
      })
      setStream(null)
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Basic Camera Test</h3>

      <div className="space-y-2">
        <Button
          onClick={testCamera}
          disabled={isLoading || !!stream}
          className="mr-2"
        >
          {isLoading ? 'Testing...' : 'Test Camera'}
        </Button>

        <Button
          onClick={stopCamera}
          disabled={!stream}
          variant="destructive"
        >
          Stop Camera
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </p>
          {error.includes('MediaDevices API not available') && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <p><strong>Solution:</strong> Access the app via localhost instead of IP address:</p>
              <p className="mt-1 font-mono">http://localhost:3001</p>
              <p className="mt-1">Camera access requires HTTPS or localhost for security reasons.</p>
            </div>
          )}
        </div>
      )}

      {stream && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">
            ✅ Camera connected successfully!
          </p>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full max-w-md border border-gray-300 rounded-lg"
        autoPlay
        muted
        playsInline
      />
    </div>
  )
}
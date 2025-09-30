'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import OptimizedScanner from '@/components/scanner/OptimizedScanner'
import ProScanner from '@/components/scanner/ProScanner'
import SimpleScanner from '@/components/scanner/SimpleScanner'
import { CheckCircle, XCircle, Clock, QrCode, Settings, Smartphone, Monitor } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TestScannersPage() {
  const [scanResults, setScanResults] = useState<{
    scanner: string
    code: string
    timestamp: Date
    success: boolean
  }[]>([])
  
  const [activeScanner, setActiveScanner] = useState<string>('optimized')
  
  const handleScanSuccess = (scanner: string) => (code: string) => {
    console.log(`✅ ${scanner} scanned:`, code)
    
    setScanResults(prev => [
      {
        scanner,
        code,
        timestamp: new Date(),
        success: true
      },
      ...prev.slice(0, 9)
    ])
    
    toast.success(
      <div>
        <strong>{scanner}</strong>
        <br />
        Đã quét: {code}
      </div>,
      { position: 'top-right' }
    )
  }
  
  const handleScanError = (scanner: string) => (error: string) => {
    console.error(`❌ ${scanner} error:`, error)
    
    setScanResults(prev => [
      {
        scanner,
        code: `Error: ${error.substring(0, 50)}`,
        timestamp: new Date(),
        success: false
      },
      ...prev.slice(0, 9)
    ])
  }
  
  const clearResults = () => {
    setScanResults([])
    toast.success('Đã xóa kết quả test')
  }
  
  const deviceInfo = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const screenSize = `${window.screen.width}x${window.screen.height}`
    const viewportSize = `${window.innerWidth}x${window.innerHeight}`
    const isHTTPS = location.protocol === 'https:'
    
    return {
      isMobile,
      screenSize,
      viewportSize,
      isHTTPS,
      userAgent: navigator.userAgent.substring(0, 50)
    }
  }
  
  const info = deviceInfo()
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6 pb-40 md:pb-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-blue-600" />
              Test QR Scanner Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-gray-500">Device</p>
                <p className="font-medium flex items-center gap-1">
                  {info.isMobile ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  {info.isMobile ? 'Mobile' : 'Desktop'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500">Screen</p>
                <p className="font-medium">{info.screenSize}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500">Viewport</p>
                <p className="font-medium">{info.viewportSize}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500">HTTPS</p>
                <p className="font-medium flex items-center gap-1">
                  {info.isHTTPS ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Secure
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      Not Secure
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Scanner Selection */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            variant={activeScanner === 'optimized' ? 'default' : 'outline'}
            className="h-auto p-4"
            onClick={() => setActiveScanner('optimized')}
          >
            <div className="text-left">
              <div className="font-semibold">Optimized Scanner</div>
              <div className="text-xs opacity-80">Production Ready</div>
            </div>
          </Button>
          
          <Button
            variant={activeScanner === 'pro' ? 'default' : 'outline'}
            className="h-auto p-4"
            onClick={() => setActiveScanner('pro')}
          >
            <div className="text-left">
              <div className="font-semibold">Pro Scanner</div>
              <div className="text-xs opacity-80">Feature Rich</div>
            </div>
          </Button>
          
          <Button
            variant={activeScanner === 'simple' ? 'default' : 'outline'}
            className="h-auto p-4"
            onClick={() => setActiveScanner('simple')}
          >
            <div className="text-left">
              <div className="font-semibold">Simple Scanner</div>
              <div className="text-xs opacity-80">Basic</div>
            </div>
          </Button>
        </div>
        
        {/* Active Scanner */}
        <Card>
          <CardContent className="p-6">
            {activeScanner === 'optimized' && (
              <OptimizedScanner
                onScanSuccess={handleScanSuccess('OptimizedScanner')}
                onScanError={handleScanError('OptimizedScanner')}
              />
            )}
            
            {activeScanner === 'pro' && (
              <ProScanner
                onScanSuccess={handleScanSuccess('ProScanner')}
                onScanError={handleScanError('ProScanner')}
              />
            )}
            
            {activeScanner === 'simple' && (
              <SimpleScanner
                onScanSuccess={handleScanSuccess('SimpleScanner')}
                onScanError={handleScanError('SimpleScanner')}
              />
            )}
          </CardContent>
        </Card>
        
        {/* Test Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearResults}
                disabled={scanResults.length === 0}
              >
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {scanResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No scan results yet</p>
                <p className="text-sm mt-1">Try scanning a QR code with any scanner above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scanResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium text-sm">
                            {result.scanner}
                          </span>
                        </div>
                        <p className="text-sm mt-1 font-mono">
                          {result.code}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

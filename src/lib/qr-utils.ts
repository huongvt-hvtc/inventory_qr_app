// Helper functions for QR code generation and scanning
import QRCode from 'qrcode'
import { Asset, AssetWithInventoryStatus } from '@/types'

// QR Code generation options
export const QR_OPTIONS = {
  errorCorrectionLevel: 'H' as const, // High error correction
  type: 'image/png' as const,
  quality: 0.92,
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  width: 256
}

// Generate QR code for asset
export async function generateAssetQR(asset: Asset | AssetWithInventoryStatus): Promise<string> {
  try {
    // Create QR data - simple format with just asset code
    // Can be extended to include more data if needed
    const qrData = asset.asset_code
    
    // Alternative: JSON format with more info
    // const qrData = JSON.stringify({
    //   asset_code: asset.asset_code,
    //   name: asset.name,
    //   department: asset.department
    // })
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, QR_OPTIONS)
    return qrCodeDataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

// Generate QR codes for multiple assets
export async function generateBulkQR(assets: (Asset | AssetWithInventoryStatus)[]): Promise<Map<string, string>> {
  const qrCodes = new Map<string, string>()
  
  for (const asset of assets) {
    try {
      const qrCode = await generateAssetQR(asset)
      qrCodes.set(asset.asset_code, qrCode)
    } catch (error) {
      console.error(`Failed to generate QR for ${asset.asset_code}:`, error)
    }
  }
  
  return qrCodes
}

// Parse QR code data
export function parseQRData(qrText: string): { asset_code: string; data?: any } | null {
  try {
    // Remove whitespace
    const cleaned = qrText.trim()
    
    // Check if it's a URL format
    if (cleaned.startsWith('http')) {
      const urlMatch = cleaned.match(/\/asset\/([^\/\?#]+)/)
      if (urlMatch) {
        return { asset_code: urlMatch[1] }
      }
    }
    
    // Check if it's JSON format
    if (cleaned.startsWith('{')) {
      const parsed = JSON.parse(cleaned)
      if (parsed.asset_code) {
        return { asset_code: parsed.asset_code, data: parsed }
      }
    }
    
    // Check for prefixed format (ASSET:XXX)
    if (cleaned.startsWith('ASSET:')) {
      return { asset_code: cleaned.replace('ASSET:', '') }
    }
    
    // Assume it's just the asset code
    if (cleaned.length > 0) {
      return { asset_code: cleaned }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing QR data:', error)
    return null
  }
}

// Validate asset code format
export function isValidAssetCode(code: string): boolean {
  // Asset code should be alphanumeric, at least 3 characters
  // Can be customized based on your requirements
  const pattern = /^[A-Za-z0-9]{3,}$/
  return pattern.test(code)
}

// Format asset code for display
export function formatAssetCode(code: string): string {
  return code.toUpperCase().trim()
}

// Generate printable QR label HTML
export function generateQRLabel(asset: Asset | AssetWithInventoryStatus, qrDataUrl: string): string {
  return `
    <div style="
      width: 200px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: center;
      font-family: Arial, sans-serif;
      page-break-inside: avoid;
      margin: 5px;
      display: inline-block;
    ">
      <img src="${qrDataUrl}" alt="QR Code" style="width: 150px; height: 150px; margin: 0 auto;">
      <div style="margin-top: 8px;">
        <div style="font-size: 14px; font-weight: bold; color: #333;">
          ${asset.asset_code}
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;">
          ${asset.name}
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 2px;">
          ${asset.department || 'N/A'} | ${asset.location || 'N/A'}
        </div>
      </div>
    </div>
  `
}

// Generate A4 page with multiple QR codes
export async function generateQRSheet(
  assets: (Asset | AssetWithInventoryStatus)[],
  itemsPerPage: number = 12
): Promise<string> {
  const pages: string[] = []
  const qrCodes = await generateBulkQR(assets)
  
  for (let i = 0; i < assets.length; i += itemsPerPage) {
    const pageAssets = assets.slice(i, i + itemsPerPage)
    
    const pageHTML = `
      <div style="
        width: 210mm;
        min-height: 297mm;
        padding: 10mm;
        background: white;
        box-sizing: border-box;
        page-break-after: always;
      ">
        <h2 style="text-align: center; margin-bottom: 20px; font-family: Arial;">
          QR Code Labels - Page ${Math.floor(i / itemsPerPage) + 1}
        </h2>
        <div style="
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          justify-items: center;
        ">
          ${pageAssets.map(asset => {
            const qrCode = qrCodes.get(asset.asset_code)
            return qrCode ? generateQRLabel(asset, qrCode) : ''
          }).join('')}
        </div>
      </div>
    `
    
    pages.push(pageHTML)
  }
  
  return pages.join('')
}

// Print QR codes
export async function printQRCodes(assets: (Asset | AssetWithInventoryStatus)[]): Promise<void> {
  try {
    const printContent = await generateQRSheet(assets)
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Could not open print window')
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Codes</title>
          <meta charset="utf-8">
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 0; size: A4; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print()
      // Optional: close window after printing
      // printWindow.close()
    }
  } catch (error) {
    console.error('Error printing QR codes:', error)
    throw error
  }
}

// Export QR codes as downloadable file
export async function exportQRCodes(
  assets: (Asset | AssetWithInventoryStatus)[],
  format: 'pdf' | 'html' = 'html'
): Promise<void> {
  try {
    if (format === 'html') {
      const content = await generateQRSheet(assets)
      const blob = new Blob([content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `qr-codes-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      // PDF export would require additional library like jsPDF
      throw new Error('PDF export not implemented yet')
    }
  } catch (error) {
    console.error('Error exporting QR codes:', error)
    throw error
  }
}

// Scanner utilities
export const SCANNER_CONFIG = {
  default: {
    fps: 10,
    qrbox: 250,
    aspectRatio: 1.777
  },
  mobile: {
    fps: 10,
    qrbox: 200,
    aspectRatio: 1.0
  },
  highPerformance: {
    fps: 15,
    qrbox: 300,
    aspectRatio: 1.777
  },
  lowPower: {
    fps: 5,
    qrbox: 200,
    aspectRatio: 1.0
  }
}

// Get optimal scanner config based on device
export function getOptimalScannerConfig() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isLowEnd = navigator.hardwareConcurrency <= 2
  
  if (isLowEnd) {
    return SCANNER_CONFIG.lowPower
  } else if (isMobile) {
    return SCANNER_CONFIG.mobile
  } else {
    return SCANNER_CONFIG.default
  }
}

// Check camera availability
export async function checkCameraAvailability(): Promise<{
  available: boolean
  cameras: MediaDeviceInfo[]
  hasRearCamera: boolean
}> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { available: false, cameras: [], hasRearCamera: false }
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter(device => device.kind === 'videoinput')
    
    // Check for rear camera (usually contains 'back' or 'rear' in label)
    const hasRearCamera = cameras.some(camera => 
      camera.label.toLowerCase().includes('back') || 
      camera.label.toLowerCase().includes('rear') ||
      camera.label.toLowerCase().includes('environment')
    )
    
    return {
      available: cameras.length > 0,
      cameras,
      hasRearCamera
    }
  } catch (error) {
    console.error('Error checking camera availability:', error)
    return { available: false, cameras: [], hasRearCamera: false }
  }
}

// Request camera permission
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    })
    
    // Stop all tracks to release camera
    stream.getTracks().forEach(track => track.stop())
    
    return true
  } catch (error) {
    console.error('Camera permission denied:', error)
    return false
  }
}

// Scan statistics tracker
export class ScanStatistics {
  private stats = {
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    scanTimes: [] as number[],
    lastScanTime: null as Date | null
  }
  
  recordSuccess(scanTime: number) {
    this.stats.totalScans++
    this.stats.successfulScans++
    this.stats.scanTimes.push(scanTime)
    this.stats.lastScanTime = new Date()
    
    // Keep only last 100 scan times
    if (this.stats.scanTimes.length > 100) {
      this.stats.scanTimes = this.stats.scanTimes.slice(-100)
    }
  }
  
  recordFailure() {
    this.stats.totalScans++
    this.stats.failedScans++
  }
  
  getStats() {
    const avgScanTime = this.stats.scanTimes.length > 0
      ? Math.round(this.stats.scanTimes.reduce((a, b) => a + b, 0) / this.stats.scanTimes.length)
      : 0
    
    const successRate = this.stats.totalScans > 0
      ? Math.round((this.stats.successfulScans / this.stats.totalScans) * 100)
      : 0
    
    return {
      ...this.stats,
      avgScanTime,
      successRate
    }
  }
  
  reset() {
    this.stats = {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      scanTimes: [],
      lastScanTime: null
    }
  }
}

// Export singleton instance
export const scanStats = new ScanStatistics()

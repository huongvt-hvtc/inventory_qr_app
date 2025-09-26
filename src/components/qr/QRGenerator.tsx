'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  QrCode, 
  Printer, 
  Download, 
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Grid3x3,
  FileDown,
  Eye
} from 'lucide-react'
import { Asset, AssetWithInventoryStatus } from '@/types'
import { 
  generateAssetQR, 
  generateBulkQR,
  printQRCodes,
  exportQRCodes
} from '@/lib/qr-utils'
import toast from 'react-hot-toast'

interface QRGeneratorProps {
  assets: (Asset | AssetWithInventoryStatus)[]
  selectedAssets?: string[] // asset IDs
  onSelectAssets?: (ids: string[]) => void
}

export default function QRGenerator({ 
  assets, 
  selectedAssets = [],
  onSelectAssets 
}: QRGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set(selectedAssets))
  const [previewMode, setPreviewMode] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  
  // Filter assets based on search
  const filteredAssets = assets.filter(asset => 
    asset.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Generate QR codes for selected assets
  const generateSelectedQR = async () => {
    setIsGenerating(true)
    
    try {
      const assetsToGenerate = selectedForPrint.size > 0 
        ? assets.filter(a => selectedForPrint.has(a.id))
        : filteredAssets
        
      if (assetsToGenerate.length === 0) {
        toast.error('Vui lòng chọn tài sản để tạo mã QR')
        return
      }
      
      const generated = await generateBulkQR(assetsToGenerate)
      setQrCodes(generated)
      
      toast.success(`Đã tạo ${generated.size} mã QR`)
      setPreviewMode(true)
    } catch (error) {
      console.error('Error generating QR codes:', error)
      toast.error('Lỗi khi tạo mã QR')
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Print QR codes
  const handlePrint = async () => {
    try {
      const assetsToPrint = selectedForPrint.size > 0
        ? assets.filter(a => selectedForPrint.has(a.id))
        : filteredAssets
        
      if (assetsToPrint.length === 0) {
        toast.error('Vui lòng chọn tài sản để in')
        return
      }
      
      await printQRCodes(assetsToPrint)
      toast.success('Đã gửi lệnh in')
    } catch (error) {
      console.error('Error printing:', error)
      toast.error('Lỗi khi in mã QR')
    }
  }
  
  // Export QR codes
  const handleExport = async () => {
    try {
      const assetsToExport = selectedForPrint.size > 0
        ? assets.filter(a => selectedForPrint.has(a.id))
        : filteredAssets
        
      if (assetsToExport.length === 0) {
        toast.error('Vui lòng chọn tài sản để xuất')
        return
      }
      
      await exportQRCodes(assetsToExport, 'html')
      toast.success('Đã xuất file QR codes')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Lỗi khi xuất file')
    }
  }
  
  // Toggle asset selection
  const toggleAssetSelection = (assetId: string) => {
    const newSelection = new Set(selectedForPrint)
    
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId)
    } else {
      newSelection.add(assetId)
    }
    
    setSelectedForPrint(newSelection)
    
    if (onSelectAssets) {
      onSelectAssets(Array.from(newSelection))
    }
  }
  
  // Select all filtered
  const selectAll = () => {
    const allIds = new Set(filteredAssets.map(a => a.id))
    setSelectedForPrint(allIds)
    
    if (onSelectAssets) {
      onSelectAssets(Array.from(allIds))
    }
  }
  
  // Clear selection
  const clearSelection = () => {
    setSelectedForPrint(new Set())
    
    if (onSelectAssets) {
      onSelectAssets([])
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            Tạo mã QR hàng loạt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Tìm theo mã, tên, phòng ban..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg"
              >
                <option value={6}>6 mã/trang</option>
                <option value={9}>9 mã/trang</option>
                <option value={12}>12 mã/trang</option>
                <option value={15}>15 mã/trang</option>
              </select>
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  Tìm thấy: <strong>{filteredAssets.length}</strong> tài sản
                </span>
                <span className="text-blue-600">
                  Đã chọn: <strong>{selectedForPrint.size}</strong>
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAll}
                  disabled={filteredAssets.length === 0}
                >
                  Chọn tất cả
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedForPrint.size === 0}
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={generateSelectedQR}
                disabled={isGenerating || filteredAssets.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Tạo mã QR
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setPreviewMode(!previewMode)}
                variant="outline"
                disabled={qrCodes.size === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Ẩn' : 'Xem'} Preview
              </Button>
              
              <Button
                onClick={handlePrint}
                variant="outline"
                disabled={qrCodes.size === 0}
              >
                <Printer className="h-4 w-4 mr-2" />
                In
              </Button>
              
              <Button
                onClick={handleExport}
                variant="outline"
                disabled={qrCodes.size === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Xuất HTML
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Asset List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Danh sách tài sản</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedForPrint.has(asset.id)
                    ? 'bg-blue-50 border-blue-300'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleAssetSelection(asset.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {selectedForPrint.has(asset.id) ? (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 border rounded" />
                      )}
                      <span className="font-medium">{asset.asset_code}</span>
                      <span className="text-sm text-gray-600">- {asset.name}</span>
                    </div>
                    <div className="ml-6 text-xs text-gray-500 mt-1">
                      {asset.department} | {asset.location || 'N/A'}
                    </div>
                  </div>
                  
                  {qrCodes.has(asset.asset_code) && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            ))}
            
            {filteredAssets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Không tìm thấy tài sản nào</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Preview */}
      {previewMode && qrCodes.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Preview mã QR ({qrCodes.size} mã)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from(qrCodes.entries()).slice(0, 12).map(([code, dataUrl]) => {
                const asset = assets.find(a => a.asset_code === code)
                
                if (!asset) return null
                
                return (
                  <div
                    key={code}
                    className="border rounded-lg p-3 text-center bg-white"
                  >
                    <img 
                      src={dataUrl} 
                      alt={`QR ${code}`}
                      className="w-32 h-32 mx-auto mb-2"
                    />
                    <div className="text-xs font-semibold">{code}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {asset.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {asset.department}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {qrCodes.size > 12 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Và {qrCodes.size - 12} mã QR khác...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

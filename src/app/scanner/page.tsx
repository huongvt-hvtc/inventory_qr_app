'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  QrCode,
  Camera,
  CameraOff,
  Keyboard,
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  Search,
  Loader2
} from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import SimpleQRScanner from '@/components/scanner/SimpleQRScanner';
import AssetDetailModal from '@/components/assets/AssetDetailModal';
import { AssetWithInventoryStatus } from '@/types';
import toast from 'react-hot-toast';

export default function ScannerPage() {
  const {
    assets,
    loading,
    searchAssets,
    checkAssets,
    uncheckAssets
  } = useAssets();

  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedAsset, setScannedAsset] = useState<AssetWithInventoryStatus | null>(null);
  const [assetDetailModal, setAssetDetailModal] = useState<{ isOpen: boolean; asset: AssetWithInventoryStatus | null; mode: 'view' | 'edit' }>({
    isOpen: false,
    asset: null,
    mode: 'view'
  });
  const [recentScans, setRecentScans] = useState<AssetWithInventoryStatus[]>([]);

  // Calculate stats from real data
  const stats = {
    total_assets: assets.length,
    checked_assets: assets.filter(a => a.is_checked).length,
    completion_rate: assets.length > 0 ? Math.round((assets.filter(a => a.is_checked).length / assets.length) * 100) : 0
  };

  const findAssetByCode = (code: string): AssetWithInventoryStatus | null => {
    return assets.find(asset =>
      asset.asset_code.toLowerCase() === code.toLowerCase() ||
      asset.name.toLowerCase().includes(code.toLowerCase()) ||
      asset.serial?.toLowerCase() === code.toLowerCase() ||
      asset.tech_code?.toLowerCase() === code.toLowerCase()
    ) || null;
  };

  const handleQRScanSuccess = (decodedText: string) => {
    console.log('📱 QR Scan Result received:', {
      decodedText,
      type: typeof decodedText,
      length: decodedText?.length
    });

    let assetCode = decodedText.trim();

    // Try to parse JSON if it's our QR format
    try {
      const parsed = JSON.parse(decodedText);
      console.log('📋 Parsed QR data:', parsed);

      if (parsed.asset_code) {
        assetCode = parsed.asset_code;
        console.log('✅ Using asset_code from JSON:', assetCode);
      }
    } catch (parseError) {
      // If it's not JSON, use the raw text as asset code
      console.log('📝 Using raw text as asset code:', assetCode);
    }

    console.log('🔍 Searching for asset with code:', assetCode);
    console.log('📊 Available assets:', assets.length);

    const foundAsset = findAssetByCode(assetCode);

    if (foundAsset) {
      console.log('✅ Asset found:', foundAsset);

      setScannedAsset(foundAsset);
      setAssetDetailModal({ isOpen: true, asset: foundAsset, mode: 'view' });

      // Add to recent scans
      setRecentScans(prev => {
        const filtered = prev.filter(scan => scan.id !== foundAsset.id);
        return [foundAsset, ...filtered].slice(0, 10); // Keep only last 10 scans
      });

      toast.success(`✅ Đã tìm thấy tài sản: ${foundAsset.asset_code} - ${foundAsset.name}`);
    } else {
      console.log('❌ Asset not found for code:', assetCode);
      console.log('📋 Available asset codes:', assets.map(a => a.asset_code));
      toast.error(`❌ Không tìm thấy tài sản với mã: ${assetCode}`);
    }
  };

  const handleQRScanError = (error: string) => {
    // Don't show error for common scanning issues
    if (!error.includes('NotFoundException')) {
      console.warn('QR Scan Error:', error);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      const foundAsset = findAssetByCode(manualCode.trim());

      if (foundAsset) {
        setScannedAsset(foundAsset);
        setAssetDetailModal({ isOpen: true, asset: foundAsset, mode: 'view' });

        // Add to recent scans
        setRecentScans(prev => {
          const filtered = prev.filter(scan => scan.id !== foundAsset.id);
          return [foundAsset, ...filtered].slice(0, 10);
        });

        toast.success(`Đã tìm thấy tài sản: ${foundAsset.asset_code}`);
      } else {
        toast.error(`Không tìm thấy tài sản với mã: ${manualCode}`);
      }

      setManualCode('');
    }
  };

  const handleAssetCheck = async (assetId: string, checkedBy: string) => {
    try {
      await checkAssets([assetId], checkedBy);
      toast.success('Đã đánh dấu kiểm kê');

      // Update recent scans to reflect the change
      setRecentScans(prev =>
        prev.map(scan =>
          scan.id === assetId
            ? { ...scan, is_checked: true, checked_by: checkedBy, checked_at: new Date().toISOString() }
            : scan
        )
      );
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kiểm kê');
    }
  };

  const handleAssetUncheck = async (assetId: string) => {
    try {
      await uncheckAssets([assetId]);
      toast.success('Đã bỏ đánh dấu kiểm kê');

      // Update recent scans to reflect the change
      setRecentScans(prev =>
        prev.map(scan =>
          scan.id === assetId
            ? { ...scan, is_checked: false, checked_by: undefined, checked_at: undefined }
            : scan
        )
      );
    } catch (error) {
      toast.error('Có lỗi xảy ra khi bỏ kiểm kê');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <QrCode className="h-6 w-6 text-blue-600" />
          QR Scanner
        </h1>
        <p className="text-xs text-gray-600 mt-0.5">
          Quét mã QR hoặc nhập mã tài sản để kiểm kê
        </p>
      </div>

      {/* Dashboard Stats - Compact for Mobile */}
      <div className="px-6 grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6">
        <Card className="border-blue-100">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center text-center md:text-left">
              <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mx-auto md:mx-0" />
              <div className="md:ml-4 mt-1 md:mt-0">
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {loading ? <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin mx-auto" /> : stats.total_assets}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Tổng TS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center text-center md:text-left">
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600 mx-auto md:mx-0" />
              <div className="md:ml-4 mt-1 md:mt-0">
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {loading ? <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin mx-auto" /> : stats.checked_assets}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Đã kiểm</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100">
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center text-center md:text-left">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-purple-600 mx-auto md:mx-0" />
              <div className="md:ml-4 mt-1 md:mt-0">
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {loading ? <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin mx-auto" /> : `${stats.completion_rate}%`}
                </p>
                <p className="text-xs md:text-sm text-gray-600">Tiến độ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SimpleQRScanner
              onScanSuccess={handleQRScanSuccess}
              onScanError={handleQRScanError}
              isActive={isScanning}
              onToggle={() => setIsScanning(!isScanning)}
            />

            {/* Manual Input */}
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Keyboard className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Nhập mã thủ công</span>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Nhập mã tài sản thủ công (VD: IT001, HR001...)"
                      className="flex-1 bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="bg-blue-600 hover:bg-blue-700 px-4"
                    >
                      <Search className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Tìm</span>
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700">
                    💡 Có thể tìm theo: Mã tài sản, Tên tài sản, Serial, Tech Code
                  </p>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Kiểm kê gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setAssetDetailModal({ isOpen: true, asset: scan, mode: 'view' })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{scan.asset_code}</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          scan.is_checked
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {scan.is_checked ? 'Đã kiểm' : 'Chưa kiểm'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{scan.name}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Bộ phận: {scan.department}</p>
                        {scan.is_checked && scan.checked_by && (
                          <>
                            <p>Người kiểm: {scan.checked_by}</p>
                            <p>Thời gian: {scan.checked_at ? formatDate(scan.checked_at) : 'N/A'}</p>
                          </>
                        )}
                        {!scan.is_checked && (
                          <p className="text-orange-600 font-medium">Chưa được kiểm kê</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {recentScans.length === 0 && (
                <div className="text-center py-6">
                  <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Chưa có lần quét nào</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Quét QR code hoặc nhập mã tài sản để bắt đầu
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        asset={assetDetailModal.asset}
        isOpen={assetDetailModal.isOpen}
        onClose={() => setAssetDetailModal({ isOpen: false, asset: null, mode: 'view' })}
        mode={assetDetailModal.mode}
        onCheck={handleAssetCheck}
        onUncheck={handleAssetUncheck}
      />
    </div>
  );
}
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Sync with navigation scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Same logic as Navigation component
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
    <div>
      {/* QR Scanner Header - Always sticky, but adjusts position based on navigation visibility */}
      <div className={`sticky bg-white border-b border-gray-200 shadow-sm transition-all duration-300 z-20 ${
        isHeaderVisible
          ? 'top-16 md:top-0' // When navigation is visible: directly below nav on mobile, top on desktop
          : 'top-0' // When navigation is hidden: always at top
      }`}>
        <div className="px-6 py-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <QrCode className="h-6 w-6 text-blue-600" />
              QR Scanner
            </h1>

            {/* Dashboard Stats - Same as Assets Page */}
            <div className="flex items-center gap-6 text-sm md:text-base border-b border-gray-100 pb-2">
              {/* Total Assets */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">Tổng:</span>
                <span className="font-bold text-blue-600 text-base md:text-lg">{loading ? '...' : stats.total_assets}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-gray-300"></div>

              {/* Checked Assets */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">Đã kiểm:</span>
                <span className="font-bold text-green-600 text-base md:text-lg">{loading ? '...' : stats.checked_assets}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-gray-300"></div>

              {/* Unchecked Assets */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">Chưa kiểm:</span>
                <span className="font-bold text-orange-600 text-base md:text-lg">{loading ? '...' : (stats.total_assets - stats.checked_assets)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* QR Scanner */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <SimpleQRScanner
              onScanSuccess={handleQRScanSuccess}
              onScanError={handleQRScanError}
              isActive={isScanning}
              onToggle={() => setIsScanning(!isScanning)}
            />

            {/* Manual Input */}
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Keyboard className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Nhập mã thủ công</span>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-2">
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
          <CardHeader className="pb-3">
            <CardTitle>
              Kiểm kê gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
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
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  QrCode,
  Keyboard,
  XCircle,
  Search,
  History,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useRecentScans } from '@/contexts/RecentScansContext';
import { useRefresh } from '@/contexts/RefreshContext';
import EnhancedScanner from '@/components/scanner/EnhancedScanner';

import Link from 'next/link';
import SimpleMobileScanner from '@/components/scanner/SimpleMobileScanner';
import AssetDetailModal from '@/components/assets/AssetDetailModal';
import { AssetWithInventoryStatus } from '@/types';
import { WiFiIndicator } from '@/components/WiFiIndicator';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';

export default function ScannerPage() {
  const { setRefreshFunction } = useRefresh();
  // Detect if mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);
  const {
    assets,
    loading,
    searchAssets,
    checkAssets,
    uncheckAssets,
    loadAssets
  } = useAssets();

  const { recentScans, addToRecentScans, updateRecentScan } = useRecentScans();

  const [manualCode, setManualCode] = useState('');
  const [scannedAsset, setScannedAsset] = useState<AssetWithInventoryStatus | null>(null);
  const [assetDetailModal, setAssetDetailModal] = useState<{ isOpen: boolean; asset: AssetWithInventoryStatus | null; mode: 'view' | 'edit' }>({
    isOpen: false,
    asset: null,
    mode: 'view'
  });
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Sync recent scans with latest asset data
  useEffect(() => {
    if (recentScans.length > 0 && assets.length > 0) {
      recentScans.forEach(scan => {
        const updatedAsset = assets.find(asset => asset.id === scan.id);
        if (updatedAsset && (
          updatedAsset.is_checked !== scan.is_checked ||
          updatedAsset.checked_by !== scan.checked_by ||
          updatedAsset.checked_at !== scan.checked_at
        )) {
          updateRecentScan(scan.id, {
            is_checked: updatedAsset.is_checked,
            checked_by: updatedAsset.checked_by,
            checked_at: updatedAsset.checked_at
          });
        }
      });
    }
  }, [assets, recentScans, updateRecentScan]);

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

  const handleQRScanSuccess = useCallback((decodedText: string) => {
    console.log('📱 QR Scan Result received:', {
      decodedText,
      type: typeof decodedText,
      length: decodedText?.length
    });

    let assetCode = decodedText.trim();

    // Try to extract asset code from different formats
    try {
      // Check if it's URL format: https://inventory.app/asset/IT001
      const urlMatch = decodedText.match(/\/asset\/([^\/\?#]+)/);
      if (urlMatch) {
        assetCode = urlMatch[1];
        console.log('✅ Extracted asset_code from URL:', assetCode);
      }
      // Try to parse JSON format
      else if (decodedText.startsWith('{')) {
        const parsed = JSON.parse(decodedText);
        console.log('📋 Parsed QR data:', parsed);

        if (parsed.asset_code) {
          assetCode = parsed.asset_code;
          console.log('✅ Using asset_code from JSON:', assetCode);
        }
      }
      // Check for ASSET: prefix format
      else if (decodedText.startsWith('ASSET:')) {
        assetCode = decodedText.replace('ASSET:', '');
        console.log('✅ Extracted asset_code from ASSET prefix:', assetCode);
      }
      // Use raw text as asset code
      else {
        console.log('📝 Using raw text as asset code:', assetCode);
      }
    } catch (parseError) {
      // If parsing fails, use the raw text as asset code
      console.log('📝 Parse failed, using raw text as asset code:', assetCode);
    }

    console.log('🔍 Searching for asset with code:', assetCode);
    console.log('📊 Available assets:', assets.length);

    const foundAsset = findAssetByCode(assetCode);

    if (foundAsset) {
      console.log('✅ Asset found:', foundAsset);

      setScannedAsset(foundAsset);
      setAssetDetailModal({ isOpen: true, asset: foundAsset, mode: 'view' });

      // Add to recent scans
      addToRecentScans(foundAsset);

      // Remove duplicate toast - already shown in scanner component
    } else {
      console.log('❌ Asset not found for code:', assetCode);
      console.log('📋 Available asset codes:', assets.map(a => a.asset_code));
      toast.error(`Không tìm thấy tài sản với mã: ${assetCode}`);
    }
  }, [assets, recentScans, addToRecentScans, updateRecentScan]);

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
        addToRecentScans(foundAsset);

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
      // Toast is already handled in useAssets hook - no need to duplicate

      // Update recent scans to reflect the change
      updateRecentScan(assetId, {
        is_checked: true,
        checked_by: checkedBy,
        checked_at: new Date().toISOString()
      });
    } catch (error) {
      // Error toast is already handled in useAssets hook
    }
  };

  const handleAssetUncheck = async (assetId: string) => {
    try {
      await uncheckAssets([assetId]);
      // Toast is already handled in useAssets hook - no need to duplicate

      // Update recent scans to reflect the change
      updateRecentScan(assetId, {
        is_checked: false,
        checked_by: undefined,
        checked_at: undefined
      });
    } catch (error) {
      // Error toast is already handled in useAssets hook
    }
  };

  const handleRefresh = async () => {
    try {
      await loadAssets(true); // Force refresh bypassing cache
      toast.success('Đã cập nhật dữ liệu mới nhất');
    } catch (error) {
      console.error('Error refreshing assets:', error);
      toast.error('Có lỗi xảy ra khi cập nhật dữ liệu');
    }
  };

  // Register refresh function for network status component
  useEffect(() => {
    setRefreshFunction(() => handleRefresh);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction]);

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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* QR Scanner Header - Always sticky at top, no interference with navigation */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="px-6 py-3">
          <PageHeader
            title="QR Scanner"
            description="Quét mã QR để kiểm kê tài sản"
            actions={
              <div className="flex items-center gap-3">
                <WiFiIndicator />
                <button
                  disabled={loading}
                  onClick={handleRefresh}
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                  title="Làm mới dữ liệu từ server"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            }
          />

          {/* Dashboard Stats */}
          <div className="flex items-center gap-6 text-sm md:text-base border-b border-gray-100 pb-2 mt-4">
              {/* Total Assets - Purple like Assets Page */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold">Tổng:</span>
                <span className="font-bold text-purple-600 text-lg md:text-xl">{loading ? '...' : stats.total_assets}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-gray-300"></div>

              {/* Checked Assets - Green like Assets Page */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold">Đã kiểm:</span>
                <span className="font-bold text-green-600 text-lg md:text-xl">{loading ? '...' : stats.checked_assets}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-gray-300"></div>

              {/* Unchecked Assets - Blue like Assets Page */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold">Chưa kiểm:</span>
                <span className="font-bold text-blue-600 text-lg md:text-xl">{loading ? '...' : (stats.total_assets - stats.checked_assets)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-6 pt-4 pb-32 md:pb-4">
          {/* Desktop: 2 columns layout, Mobile: stack */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Left Column: Scanner + Manual Input */}
            <div className="space-y-1">
              {/* QR Scanner */}
              <Card className="relative">
                <CardContent className="p-4">
                  {isMobile ? (
                    <SimpleMobileScanner
                      onScanSuccess={handleQRScanSuccess}
                      shouldPauseScanning={assetDetailModal.isOpen}
                    />
                  ) : (
                    <EnhancedScanner
                      onScanSuccess={handleQRScanSuccess}
                      onScanError={handleQRScanError}
                    />
                  )}

                  {/* Show pause overlay when modal is open */}
                  {assetDetailModal.isOpen && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-orange-600 font-medium mb-2">
                          Scanner tạm dừng
                        </div>
                        <div className="text-sm text-gray-600">
                          Đóng cửa sổ chi tiết để tiếp tục quét
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manual Input - Moved closer to scanner */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Keyboard className="h-5 w-5 text-blue-600" />
                    Nhập mã thủ công
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  <form onSubmit={handleManualSubmit} className="space-y-2">
                    <Input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Nhập mã tài sản (VD: IT001, HR001...)"
                      className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Tìm kiếm tài sản
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Recent Scans Link & Quick Stats */}
            <div className="space-y-4">
              {/* Recent Scans Link Card */}
              <Link href="/recent-inventory">
                <Card className="h-[400px] lg:h-[450px] cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-gray-300 hover:border-green-500 bg-gradient-to-br from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100">
                  <CardHeader className="text-center pb-3">
                    <CardTitle className="flex items-center justify-center gap-2 text-green-700">
                      <History className="h-6 w-6" />
                      Kiểm kê gần đây
                      <ExternalLink className="h-4 w-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-col items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <History className="h-10 w-10 text-green-600" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {recentScans.length} lần kiểm kê
                        </h3>
                        <p className="text-sm text-gray-600 max-w-xs">
                          Xem chi tiết lịch sử kiểm kê, tìm kiếm và quản lý các lần kiểm kê gần đây
                        </p>
                      </div>

                      {recentScans.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {recentScans.filter(s => s.is_checked).length}
                            </div>
                            <div className="text-xs text-gray-500">Đã kiểm</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {recentScans.filter(s => !s.is_checked).length}
                            </div>
                            <div className="text-xs text-gray-500">Chưa kiểm</div>
                          </div>
                        </div>
                      )}

                      <div className="mt-6">
                        <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                          Xem chi tiết
                        </Button>
                      </div>
                    </div>

                    {recentScans.length === 0 && (
                      <div className="text-center py-8">
                        <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">Chưa có lần kiểm kê nào</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Quét QR code hoặc nhập mã tài sản để bắt đầu
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>

              {/* Quick Recent Items Preview */}
              {recentScans.length > 0 && (
                <Card className="h-[500px] lg:h-[550px]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Xem trước gần đây
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-[450px] lg:max-h-[500px] overflow-y-auto">
                      {recentScans.slice(0, 5).map((scan) => (
                        <div
                          key={scan.id}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setAssetDetailModal({ isOpen: true, asset: scan, mode: 'view' })}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 text-sm">{scan.asset_code}</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  scan.is_checked
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {scan.is_checked ? 'Đã kiểm' : 'Chưa kiểm'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 break-words line-clamp-1">{scan.name}</p>
                              <div className="mt-1 text-xs text-gray-500">
                                <p>Bộ phận: {scan.department}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {recentScans.length > 5 && (
                        <Link href="/recent-inventory">
                          <div className="p-3 border border-dashed border-gray-300 rounded-lg hover:bg-green-50 cursor-pointer transition-colors text-center">
                            <p className="text-sm text-green-600 font-medium">
                              Xem thêm {recentScans.length - 5} mục khác...
                            </p>
                          </div>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
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
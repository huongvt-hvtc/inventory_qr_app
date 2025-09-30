'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  History,
  Search,
  Filter,
  FilterX,
  Eye,
  Check,
  X,
  Clock,
  User,
  Package,
  Building,
  MapPin,
  Tag,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useRecentScans } from '@/contexts/RecentScansContext';
import { useAssets } from '@/hooks/useAssets';
import { useRefresh } from '@/contexts/RefreshContext';
import AssetDetailModal from '@/components/assets/AssetDetailModal';
import { AssetWithInventoryStatus } from '@/types';
import { WiFiIndicator } from '@/components/WiFiIndicator';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function RecentInventoryPage() {
  const { user } = useAuth();
  const { setRefreshFunction } = useRefresh();
  const { recentScans, clearRecentScans, updateRecentScan, refreshScans } = useRecentScans();
  const { assets, checkAssets, uncheckAssets, loadAssets, loading, updateAsset } = useAssets();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked' | 'unchecked'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedScans, setSelectedScans] = useState<Set<string>>(new Set());

  const [assetDetailModal, setAssetDetailModal] = useState<{
    isOpen: boolean;
    asset: AssetWithInventoryStatus | null;
    mode: 'view' | 'edit'
  }>({
    isOpen: false,
    asset: null,
    mode: 'view'
  });

  // Filter and search logic
  useEffect(() => {
    if (assets.length === 0 || recentScans.length === 0) return;

    recentScans.forEach(scan => {
      const updatedAsset = assets.find(asset => asset.id === scan.id);
      if (updatedAsset) {
        const hasChanges =
          updatedAsset.is_checked !== scan.is_checked ||
          updatedAsset.checked_by !== scan.checked_by ||
          updatedAsset.checked_at !== scan.checked_at;
        if (hasChanges) {
          updateRecentScan(scan.id, {
            is_checked: updatedAsset.is_checked,
            checked_by: updatedAsset.checked_by,
            checked_at: updatedAsset.checked_at
          });
        }
      }
    });
  }, [assets, recentScans, updateRecentScan]);

  const handleSearchSubmit = () => {
    setActiveSearchTerm(searchTerm.trim());
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchSubmit();
    }
  };

  const filteredScans = useMemo(() => {
    return recentScans.filter(scan => {
      // Search filter
      if (activeSearchTerm) {
        const term = activeSearchTerm.toLowerCase();
        if (!scan.asset_code.toLowerCase().includes(term) &&
            !scan.name.toLowerCase().includes(term) &&
            !(scan.department?.toLowerCase().includes(term)) &&
            !(scan.serial?.toLowerCase().includes(term))) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'checked' && !scan.is_checked) return false;
      if (statusFilter === 'unchecked' && scan.is_checked) return false;

      // Department filter
      if (departmentFilter !== 'all' && scan.department !== departmentFilter) return false;

      return true;
    });
  }, [recentScans, activeSearchTerm, statusFilter, departmentFilter]);

  // Get unique departments for filter
  const departments = Array.from(new Set(recentScans.map(s => s.department).filter(dept => dept && dept.trim() !== ''))) as string[];

  // Statistics - Using actual assets data like QR Scanner tab
  const stats = useMemo(() => {
    const total_assets = assets.length;
    const checked_assets = assets.filter(a => a.is_checked).length;
    const unchecked_assets = total_assets - checked_assets;

    return { total_assets, checked_assets, unchecked_assets };
  }, [assets]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewAsset = (asset: AssetWithInventoryStatus) => {
    setAssetDetailModal({ isOpen: true, asset, mode: 'view' });
  };

  const handleAssetSave = async (asset: AssetWithInventoryStatus) => {
    try {
      console.log('🚀 Starting asset save:', { asset, user });

      // Check if user is authenticated
      if (!user) {
        toast.error('Vui lòng đăng nhập để lưu tài sản');
        return;
      }

      if (asset.id) {
        // Filter out inventory-related fields that don't belong in assets table
        const { is_checked, checked_by, checked_at, inventory_notes, ...assetData } = asset;

        console.log('📝 Updating existing asset:', assetData);
        // Update existing asset in database
        await updateAsset(asset.id, assetData);

        // Immediately update the modal's asset state
        setAssetDetailModal(prev => ({
          ...prev,
          asset: {
            ...asset,
            updated_at: new Date().toISOString()
          }
        }));

        // Update recent scan in context
        updateRecentScan(asset.id, asset);

        toast.success('Đã cập nhật tài sản');
        console.log('✅ Asset saved successfully');
      }
    } catch (error) {
      console.error('💥 Error saving asset:', error);
      toast.error('Lỗi khi lưu tài sản');
    }
  };

  const toggleSelectScan = (scanId: string) => {
    const newSelected = new Set(selectedScans);
    if (newSelected.has(scanId)) {
      newSelected.delete(scanId);
    } else {
      newSelected.add(scanId);
    }
    setSelectedScans(newSelected);
  };

  const selectAllScans = () => {
    if (selectedScans.size === filteredScans.length) {
      setSelectedScans(new Set());
    } else {
      setSelectedScans(new Set(filteredScans.map(s => s.id)));
    }
  };

  const handleBulkCheck = async () => {
    if (!user || selectedScans.size === 0) return;

    try {
      const userName = user.name || user.email || 'Unknown User';
      await checkAssets(Array.from(selectedScans), userName);
      setSelectedScans(new Set());
      toast.success(`Đã kiểm kê ${selectedScans.size} tài sản`);
    } catch (error) {
      console.error('Error checking assets:', error);
      toast.error('Có lỗi xảy ra khi kiểm kê');
    }
  };

  const handleBulkUncheck = async () => {
    if (selectedScans.size === 0) return;

    try {
      await uncheckAssets(Array.from(selectedScans));
      setSelectedScans(new Set());
      toast.success(`Đã bỏ kiểm kê ${selectedScans.size} tài sản`);
    } catch (error) {
      console.error('Error unchecking assets:', error);
      toast.error('Có lỗi xảy ra khi bỏ kiểm kê');
    }
  };


  const handleClearRecentScans = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử kiểm kê gần đây không?')) {
      clearRecentScans();
      setSelectedScans(new Set());
      toast.success('Đã xóa lịch sử kiểm kê gần đây');
    }
  };

  const handleRefresh = async () => {
    const toastId = toast.loading('Đang cập nhật dữ liệu...');
    try {
      // Refresh both assets and scan history in parallel
      await Promise.all([
        loadAssets(true), // Force refresh bypassing cache
        refreshScans()     // Refresh scan history from database
      ]);
      toast.success('Đã cập nhật dữ liệu mới nhất', { id: toastId });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Có lỗi xảy ra khi cập nhật dữ liệu', { id: toastId });
    }
  };

  // Register refresh function for network status component
  React.useEffect(() => {
    setRefreshFunction(() => handleRefresh);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction]);

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'all' || departmentFilter !== 'all';

  const clearAllFilters = () => {
    setStatusFilter('all');
    setDepartmentFilter('all');
    setSearchTerm('');
    setActiveSearchTerm('');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Container */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 relative z-30">
        {/* Header Section */}
        <div className="px-4 md:px-6 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2 flex-shrink min-w-0">
                <History className="h-5 w-5 md:h-6 md:w-6 text-green-600 flex-shrink-0" />
                <span className="truncate">Kiểm kê gần đây</span>
              </h1>

              {/* WiFi & Refresh Button in Header */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 relative z-40">
                <WiFiIndicator />
                <button
                  disabled={loading}
                  onClick={handleRefresh}
                  className="h-10 px-3 md:px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg active:shadow-sm relative z-50"
                  title="Làm mới dữ liệu từ server"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  type="button"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
              </div>
            </div>

            {/* Dashboard Stats - Matching Assets and QR Scanner Tabs */}
            <div className="flex items-center gap-6 text-sm md:text-base border-b border-gray-100 pb-2">
              {/* Total Assets - Purple like QR Scanner */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold text-sm md:text-base">Tổng:</span>
                <span className="font-bold text-purple-600 text-lg md:text-xl">{loading ? '...' : stats.total_assets}</span>
              </div>

              <div className="w-px h-5 bg-gray-300"></div>

              {/* Checked Assets - Green like QR Scanner */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold text-sm md:text-base">Đã kiểm:</span>
                <span className="font-bold text-green-600 text-lg md:text-xl">{loading ? '...' : stats.checked_assets}</span>
              </div>

              <div className="w-px h-5 bg-gray-300"></div>

              {/* Unchecked Assets - Blue like QR Scanner */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold text-sm md:text-base">Chưa kiểm:</span>
                <span className="font-bold text-blue-600 text-lg md:text-xl">{loading ? '...' : stats.unchecked_assets}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllScans}
                disabled={filteredScans.length === 0}
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {selectedScans.size === filteredScans.length && filteredScans.length > 0 ? (
                  <>
                    <X className="h-4 w-4" />
                    Bỏ chọn hết
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Chọn hết
                  </>
                )}
              </button>

              <button
                onClick={handleClearRecentScans}
                disabled={recentScans.length === 0}
                className="h-10 px-4 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                <Trash2 className="h-4 w-4" />
                Xóa lịch sử
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedScans.size > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkCheck}
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Check className="h-4 w-4" />
                  Kiểm kê ({selectedScans.size})
                </button>

                <button
                  onClick={handleBulkUncheck}
                  className="h-10 px-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <X className="h-4 w-4" />
                  Bỏ kiểm kê ({selectedScans.size})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Tìm kiếm theo mã, tên, bộ phận, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 h-10 px-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              <Button
                type="button"
                onClick={handleSearchSubmit}
                className="h-10 w-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow-md" aria-label="Tìm kiếm"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className={`h-10 px-4 font-semibold text-sm rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md ${
                hasActiveFilters
                  ? 'bg-orange-500 text-white border border-orange-500 hover:bg-orange-600'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Lọc</span>
              {hasActiveFilters && (
                <span className="bg-white text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {[statusFilter, departmentFilter].filter(f => f !== 'all').length}
                </span>
              )}
            </Button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'checked' | 'unchecked')}
                  className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="checked">Đã kiểm kê</option>
                  <option value="unchecked">Chưa kiểm kê</option>
                </select>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả bộ phận</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {hasActiveFilters && `${[statusFilter, departmentFilter].filter(f => f !== 'all').length} bộ lọc đang áp dụng`}
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button
                      onClick={clearAllFilters}
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FilterX className="h-4 w-4" />
                      Bỏ lọc
                    </Button>
                  )}

                  <Button
                    onClick={() => setShowFilters(false)}
                    size="sm"
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Xác nhận
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto pb-48 md:pb-6">
          <div className="px-4 md:px-6 py-4">
            {filteredScans.length === 0 ? (
              <div className="text-center py-16">
                <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {recentScans.length === 0 ? 'Chưa có lịch sử kiểm kê' : 'Không tìm thấy kết quả'}
                </h3>
                <p className="text-gray-500">
                  {recentScans.length === 0
                    ? 'Hãy bắt đầu quét QR hoặc kiểm kê tài sản để xem lịch sử tại đây'
                    : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:flex md:flex-col gap-3">
                  {filteredScans.map((scan) => (
                    <Card
                      key={`desktop-${scan.id}-${scan.checked_at || 'unchecked'}`}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                        selectedScans.has(scan.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleSelectScan(scan.id)}
                    >
                      <CardContent className="p-4 flex items-start justify-between gap-6">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              scan.is_checked ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {scan.is_checked ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                              {scan.is_checked ? 'Đã kiểm' : 'Chưa kiểm'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`font-bold text-sm ${scan.is_checked ? 'text-green-600' : 'text-blue-600'}`}>
                                {scan.asset_code}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">{scan.department || 'N/A'}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-900 mb-2">
                              {scan.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              {scan.status && (
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {scan.status}
                                </span>
                              )}
                              {scan.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {scan.location}
                                </span>
                              )}
                              {scan.serial && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Tag className="h-3 w-3" />
                                  {scan.serial}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-xs text-gray-500 text-right">
                            {scan.is_checked && scan.checked_by && (
                              <div className="flex items-center gap-1 justify-end">
                                <User className="h-3 w-3 text-gray-400" />
                                <span>{scan.checked_by}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 justify-end mt-1 text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span className="font-mono">{scan.is_checked ? formatDate(scan.checked_at) : 'Chưa kiểm kê'}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAsset(scan);
                            }}
                            className="h-8 px-3 bg-white border border-gray-300 hover:border-blue-300 hover:bg-blue-50 text-sm font-medium text-gray-700 rounded-lg transition-colors"
                          >
                            Xem
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 md:hidden">
                  {filteredScans.map((scan) => (
                    <Card
                      key={`mobile-${scan.id}-${scan.checked_at || 'unchecked'}`}
                      className={`transition-all duration-200 hover:shadow-md border ${
                        selectedScans.has(scan.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left side: Main info */}
                          <div
                            className="flex-1 min-w-0 space-y-2 cursor-pointer"
                            onClick={() => toggleSelectScan(scan.id)}
                          >
                            {/* Asset Code and Status */}
                            <div className="flex items-center gap-2">
                              <div className={`font-bold text-sm ${scan.is_checked ? 'text-green-600' : 'text-blue-600'}`}>
                                {scan.asset_code}
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                scan.is_checked ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {scan.is_checked ? <CheckCircle className="h-3 w-3 mr-0.5" /> : <AlertCircle className="h-3 w-3 mr-0.5" />}
                                {scan.is_checked ? 'Đã kiểm' : 'Chưa kiểm'}
                              </span>
                            </div>

                            {/* Asset Name */}
                            <div className="text-xs text-gray-900 font-medium line-clamp-2 leading-relaxed">
                              {scan.name}
                            </div>

                            {/* Department and Location */}
                            <div className="space-y-1 text-[10px] text-gray-600">
                              {scan.department && (
                                <div className="flex items-center gap-1">
                                  <Building className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{scan.department}</span>
                                </div>
                              )}
                              {scan.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{scan.location}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right side: View button + Inspector and Time */}
                          <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
                            {/* View button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAsset(scan);
                              }}
                              className="h-8 w-8 flex items-center justify-center bg-white border border-blue-300 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </button>

                            {/* Inspector and Time */}
                            <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500">
                              {scan.is_checked && scan.checked_by && (
                                <div className="flex items-center gap-1 text-right">
                                  <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="truncate max-w-[80px]">{scan.checked_by}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-right">
                                <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="font-mono text-[9px]">
                                  {scan.is_checked ? formatDate(scan.checked_at)?.replace(/:\d{2}$/, '') : 'Chưa kiểm'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        asset={assetDetailModal.asset}
        isOpen={assetDetailModal.isOpen}
        onClose={() => setAssetDetailModal({ isOpen: false, asset: null, mode: 'view' })}
        mode={assetDetailModal.mode}
        onSave={handleAssetSave}
        onCheck={async (assetId, checkedBy) => {
          await checkAssets([assetId], checkedBy);
        }}
        onUncheck={(assetId) => uncheckAssets([assetId])}
      />
    </div>
  );
}
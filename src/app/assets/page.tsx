'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Search,
  Plus,
  Upload,
  Download,
  QrCode,
  Check,
  X,
  Trash2,
  Eye,
  Loader2,
  Filter,
  FilterX,
  FolderOpen
} from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { debounce } from '@/lib/utils';
import AssetDetailModal from '@/components/assets/AssetDetailModal';
import QRPrintModal from '@/components/assets/QRPrintModal';
import ImportModal from '@/components/assets/ImportModal';
import { exportToExcel } from '@/lib/excel';
import { Asset, AssetWithInventoryStatus } from '@/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function AssetsPage() {
  const { user } = useAuth();
  const {
    assets,
    loading,
    error,
    loadAssets,
    searchAssets,
    checkAssets,
    uncheckAssets,
    deleteAsset,
    deleteAssetSilent,
    updateAsset,
    createAsset,
    bulkCreateAssets,
    importAssetsWithOverwrite
  } = useAssets();
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'checked' | 'unchecked'>('all');
  const [showFilters, setShowFilters] = useState(false);
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

  // Modal states
  const [assetDetailModal, setAssetDetailModal] = useState<{ isOpen: boolean; asset: AssetWithInventoryStatus | null; mode: 'view' | 'edit' | 'create' }>({
    isOpen: false,
    asset: null,
    mode: 'view'
  });
  const [qrPrintModal, setQrPrintModal] = useState<{ isOpen: boolean; assets: AssetWithInventoryStatus[] }>({
    isOpen: false,
    assets: []
  });
  const [importModal, setImportModal] = useState(false);

  // Handle search and filter changes
  useEffect(() => {
    // If no search term and no filters, just load all assets
    if (!searchTerm && departmentFilter === 'all' && statusFilter === 'all' && inventoryFilter === 'all') {
      return; // Let the initial load from useAssets handle this
    }

    const filters = {
      department: departmentFilter !== 'all' ? departmentFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      inventory_status: inventoryFilter
    };

    const timeoutId = setTimeout(() => {
      searchAssets(searchTerm, filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, departmentFilter, statusFilter, inventoryFilter, searchAssets]);

  // Use assets directly from hook (already filtered)
  const filteredAssets = assets;

  const toggleSelectAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const selectAllAssets = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleCheckAssets = async () => {
    if (selectedAssets.size === 0 || !user) return;

    try {
      // Use real Gmail user name from AuthContext
      const userName = user.name || user.email || 'Unknown User';
      await checkAssets(Array.from(selectedAssets), userName);
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Error checking assets:', error);
    }
  };

  const handleUncheckAssets = async () => {
    if (selectedAssets.size === 0) return;

    try {
      await uncheckAssets(Array.from(selectedAssets));
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Error unchecking assets:', error);
    }
  };

  const handleDeleteAssets = async () => {
    if (selectedAssets.size === 0) return;

    const assetCount = selectedAssets.size;
    if (confirm(`Bạn có chắc muốn xóa ${assetCount} tài sản?`)) {
      let toastId: string | null = null;

      try {
        const assetIds = Array.from(selectedAssets);

        // Show progress toast for multiple deletes
        if (assetCount > 3) {
          toastId = toast.loading(`Đang xóa tài sản... 0% (0/${assetCount})`, { duration: Infinity });
        }

        // Use silent delete to avoid individual notifications
        for (let i = 0; i < assetIds.length; i++) {
          await deleteAssetSilent(assetIds[i]);

          // Update progress
          if (toastId) {
            const progress = Math.round(((i + 1) / assetCount) * 80); // 80% for deletion
            toast.loading(`Đang xóa tài sản... ${progress}% (${i + 1}/${assetCount})`, { id: toastId });
          }
        }

        // Update progress for list refresh
        if (toastId) {
          toast.loading(`Đang cập nhật danh sách... 90%`, { id: toastId });
        }

        // Refresh the asset list manually since silent delete doesn't do it
        await loadAssets(true);

        // Dismiss progress toast
        if (toastId) {
          toast.dismiss(toastId);
        }

        setSelectedAssets(new Set());
        // Single summary notification
        toast.success(`✅ Đã xóa ${assetCount} tài sản thành công`);
      } catch (error) {
        // Dismiss progress toast on error
        if (toastId) toast.dismiss(toastId);

        console.error('Error deleting assets:', error);
        toast.error('❌ Có lỗi xảy ra khi xóa tài sản');
      }
    }
  };

  const handlePrintQR = () => {
    if (selectedAssets.size === 0) {
      toast.error('Vui lòng chọn ít nhất một tài sản để in QR');
      return;
    }

    const selectedAssetsList = assets.filter(asset => selectedAssets.has(asset.id));
    setQrPrintModal({ isOpen: true, assets: selectedAssetsList });
  };

  const handleExport = () => {
    try {
      const exportAssets = filteredAssets.length > 0 ? filteredAssets : assets;
      console.log('Exporting assets:', exportAssets.length);
      console.log('Sample asset:', exportAssets[0]);
      exportToExcel(exportAssets, 'assets_export');
      toast.success(`Đã xuất ${exportAssets.length} tài sản ra Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu');
    }
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

        // Immediately update the modal's asset state with the form data
        // This ensures the modal shows the updated information right away
        setAssetDetailModal(prev => ({
          ...prev,
          asset: {
            ...asset,
            updated_at: new Date().toISOString() // Update the timestamp
          }
        }));

        toast.success('Cập nhật tài sản thành công');
      } else {
        // Create new asset - remove ID and inventory fields
        const { id, is_checked, checked_by, checked_at, inventory_notes, ...assetData } = asset;
        console.log('🆕 Creating new asset:', assetData);

        await createAsset(assetData);

        // Close modal after successful creation
        setAssetDetailModal({ isOpen: false, asset: null, mode: 'view' });
      }
    } catch (error) {
      console.error('💥 Error saving asset:', error);

      // More detailed error handling
      if (error instanceof Error) {
        if (error.message.includes('not authenticated') || error.message.includes('unauthorized')) {
          toast.error('Lỗi xác thực. Vui lòng đăng nhập lại.');
        } else if (error.message.includes('violates')) {
          toast.error('Dữ liệu không hợp lệ. Kiểm tra mã tài sản đã tồn tại chưa.');
        } else {
          toast.error(`Lỗi lưu tài sản: ${error.message}`);
        }
      } else {
        toast.error('Có lỗi không xác định xảy ra khi lưu tài sản');
      }
    }
  };

  const handleImportAssets = async (importedAssets: AssetWithInventoryStatus[], duplicates?: { asset: any; existingAsset: AssetWithInventoryStatus }[]) => {
    try {
      if (duplicates && duplicates.length > 0) {
        // Use overwrite import when duplicates are provided
        await importAssetsWithOverwrite(importedAssets, duplicates);
      } else {
        // Use regular bulk create when no duplicates
        await bulkCreateAssets(importedAssets);
      }
      setImportModal(false);
    } catch (error) {
      console.error('Error importing assets:', error);
      toast.error('Có lỗi xảy ra khi import tài sản');
    }
  };

  const handleViewAsset = (asset: AssetWithInventoryStatus) => {
    setAssetDetailModal({ isOpen: true, asset, mode: 'view' });
  };

  const handleCreateAsset = () => {
    setAssetDetailModal({ isOpen: true, asset: null, mode: 'create' });
  };

  // Check if any filters are active
  const hasActiveFilters = departmentFilter !== 'all' || statusFilter !== 'all' || inventoryFilter !== 'all';

  // Clear all filters
  const clearAllFilters = () => {
    setDepartmentFilter('all');
    setStatusFilter('all');
    setInventoryFilter('all');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang sử dụng': return 'bg-green-100 text-green-800';
      case 'Tốt': return 'bg-blue-100 text-blue-800';
      case 'Khá': return 'bg-yellow-100 text-yellow-800';
      case 'Cũ': return 'bg-gray-100 text-gray-800';
      case 'Hỏng': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique departments and statuses for filters
  const departments = Array.from(new Set(assets.map(a => a.department)));
  const statuses = Array.from(new Set(assets.map(a => a.status)));

  return (
    <div>
      {/* Assets Header - Always sticky, but adjusts position based on navigation visibility */}
      <div className={`sticky bg-white border-b border-gray-200 shadow-sm transition-all duration-300 z-20 ${
        isHeaderVisible
          ? 'top-16 md:top-0' // When navigation is visible: directly below nav on mobile, top on desktop
          : 'top-0' // When navigation is hidden: always at top
      }`}>
        {/* Title and Actions */}
        <div className="px-6 py-3">
          <div className="flex flex-col gap-2">
            {/* Title */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FolderOpen className="h-6 w-6 text-blue-600" />
                Tài sản
              </h1>
            </div>

            {/* Dashboard Stats - Single Row */}
            <div className="flex items-center gap-6 text-sm md:text-base border-b border-gray-100 pb-2">
              {/* Total Assets */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">Tổng:</span>
                <span className="font-bold text-blue-600 text-base md:text-lg">{loading ? '...' : assets.length}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-gray-300"></div>

              {/* Checked Assets */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">Đã kiểm:</span>
                <span className="font-bold text-green-600 text-base md:text-lg">{loading ? '...' : assets.filter(a => a.is_checked).length}</span>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-gray-300"></div>

              {/* Unchecked Assets */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">Chưa kiểm:</span>
                <span className="font-bold text-orange-600 text-base md:text-lg">{loading ? '...' : assets.filter(a => !a.is_checked).length}</span>
              </div>
            </div>

            {/* Action Buttons - Professional Design */}
            <div className="space-y-1">
              {/* Desktop Layout */}
              <div className="hidden md:flex items-center gap-2">
                {/* Primary Actions */}
                <button
                  title="Thêm tài sản mới"
                  disabled={loading}
                  onClick={handleCreateAsset}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm mới</span>
                </button>

                <button
                  title="Nhập dữ liệu từ file Excel"
                  disabled={loading}
                  onClick={() => setImportModal(true)}
                  className="h-9 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4" />
                  <span>Nhập</span>
                </button>

                <button
                  title="Xuất dữ liệu ra file Excel"
                  disabled={loading}
                  onClick={handleExport}
                  className="h-9 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  <span>Xuất</span>
                </button>

                {/* Vertical Separator - Only when items selected */}
                {selectedAssets.size > 0 && (
                  <div className="w-px h-6 bg-gray-300 mx-2"></div>
                )}

                {/* Selection Actions (only when items selected) */}
                {selectedAssets.size > 0 && (
                  <>
                    <button
                      title="Đánh dấu đã kiểm kê"
                      disabled={loading}
                      onClick={handleCheckAssets}
                      className="h-9 px-3 bg-white border border-green-600 hover:bg-green-600 hover:text-white text-green-600 text-sm font-medium rounded-md transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      <span>Check</span>
                    </button>

                    <button
                      title="Bỏ đánh dấu kiểm kê"
                      disabled={loading}
                      onClick={handleUncheckAssets}
                      className="h-9 px-3 bg-white border border-orange-600 hover:bg-orange-600 hover:text-white text-orange-600 text-sm font-medium rounded-md transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4" />
                      <span>Uncheck</span>
                    </button>

                    <button
                      title="In mã QR cho tài sản đã chọn"
                      disabled={loading}
                      onClick={handlePrintQR}
                      className="h-9 px-3 bg-white border border-purple-600 hover:bg-purple-600 hover:text-white text-purple-600 text-sm font-medium rounded-md transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>In QR</span>
                    </button>

                    <button
                      title="Xóa tài sản đã chọn"
                      disabled={loading}
                      onClick={handleDeleteAssets}
                      className="h-9 px-3 bg-white border border-red-600 hover:bg-red-600 hover:text-white text-red-600 text-sm font-medium rounded-md transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Xóa</span>
                    </button>
                  </>
                )}
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden space-y-2">
                {/* Primary Actions */}
                <div className="flex items-center gap-2">
                  <button
                    title="Thêm tài sản mới"
                    disabled={loading}
                    onClick={handleCreateAsset}
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Thêm mới</span>
                  </button>

                  <button
                    title="Nhập dữ liệu từ file Excel"
                    disabled={loading}
                    onClick={() => setImportModal(true)}
                    className="h-9 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Nhập</span>
                  </button>

                  <button
                    title="Xuất dữ liệu ra file Excel"
                    disabled={loading}
                    onClick={handleExport}
                    className="h-9 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
                    <span>Xuất</span>
                  </button>
                </div>

                {/* Selection Actions - Single line on mobile without icons */}
                {selectedAssets.size > 0 && (
                  <div className="flex gap-1">
                    <button
                      title="Đánh dấu đã kiểm kê"
                      disabled={loading}
                      onClick={handleCheckAssets}
                      className="flex-1 h-9 px-2 bg-white border border-green-600 hover:bg-green-600 hover:text-white text-green-600 text-xs font-medium rounded-md transition-all duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>Check</span>}
                    </button>

                    <button
                      title="Bỏ đánh dấu kiểm kê"
                      disabled={loading}
                      onClick={handleUncheckAssets}
                      className="flex-1 h-9 px-2 bg-white border border-orange-600 hover:bg-orange-600 hover:text-white text-orange-600 text-xs font-medium rounded-md transition-all duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Uncheck</span>
                    </button>

                    <button
                      title="In mã QR cho tài sản đã chọn"
                      disabled={loading}
                      onClick={handlePrintQR}
                      className="flex-1 h-9 px-2 bg-white border border-purple-600 hover:bg-purple-600 hover:text-white text-purple-600 text-xs font-medium rounded-md transition-all duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>In QR</span>
                    </button>

                    <button
                      title="Xóa tài sản đã chọn"
                      disabled={loading}
                      onClick={handleDeleteAssets}
                      className="flex-1 h-9 px-2 bg-white border border-red-600 hover:bg-red-600 hover:text-white text-red-600 text-xs font-medium rounded-md transition-all duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Xóa</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Toggle */}
        <div className="px-6 py-3 bg-gray-50 border-t">
          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Tìm kiếm tài sản..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>

            {/* Filter Toggle Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 font-medium transition-all duration-200 ${
                hasActiveFilters
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 hover:from-orange-600 hover:to-orange-700 shadow-md transform hover:scale-105'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Bộ lọc</span>
              {hasActiveFilters && (
                <span className="ml-2 bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                  {[departmentFilter, statusFilter, inventoryFilter].filter(f => f !== 'all').length}
                </span>
              )}
            </Button>
          </div>

          {/* Collapsible Advanced Filters */}
          {showFilters && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value as 'all' | 'checked' | 'unchecked')}
                  className="h-9 px-3 py-1 border border-gray-300 rounded-md text-sm"
                  disabled={loading}
                >
                  <option value="all">Tất cả kiểm kê</option>
                  <option value="checked">Đã kiểm kê</option>
                  <option value="unchecked">Chưa kiểm kê</option>
                </select>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-9 px-3 py-1 border border-gray-300 rounded-md text-sm"
                  disabled={loading}
                >
                  <option value="all">Tất cả bộ phận</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3 py-1 border border-gray-300 rounded-md text-sm"
                  disabled={loading}
                >
                  <option value="all">Tất cả tình trạng</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 text-red-700 hover:from-red-500 hover:to-pink-500 hover:text-white hover:border-red-500 font-semibold shadow-md transform hover:scale-105 transition-all duration-200"
                  >
                    <FilterX className="h-4 w-4 mr-2" />
                    🗑️ Xóa tất cả bộ lọc
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assets Table */}
      <div className="pt-4">
        <Card>
        <CardContent className="p-0">
          {loading && assets.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Đang tải dữ liệu...</span>
            </div>
          )}

          {error && assets.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Lỗi kết nối cơ sở dữ liệu</p>
              <p className="text-sm text-gray-400">Hiển thị dữ liệu mẫu cho demo</p>
            </div>
          )}

          <div className="overflow-x-auto max-h-[calc(100vh-180px)] overflow-y-auto">
            {/* Status Guide - Scrollable inside the table container */}
            <div className="flex items-center gap-4 px-6 py-2 text-sm text-gray-600 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>Chưa kiểm kê</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>Đã kiểm kê</span>
              </div>
            </div>
            <table className="w-full table-auto">
              <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-16 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                      onChange={selectAllAssets}
                      className="rounded"
                    />
                  </th>
                  <th className="min-w-[120px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Mã tài sản</th>
                  <th className="min-w-[200px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Tên tài sản</th>
                  <th className="min-w-[140px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Model</th>
                  <th className="min-w-[120px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Serial</th>
                  <th className="min-w-[100px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Tech Code</th>
                  <th className="min-w-[140px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Bộ phận</th>
                  <th className="min-w-[120px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Tình trạng</th>
                  <th className="min-w-[160px] p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200">Vị trí</th>
                  <th className="w-20 p-3 text-center text-sm font-semibold text-gray-900 sticky right-0 bg-gray-50">
                    Xem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => toggleSelectAsset(asset.id)}
                    className={`cursor-pointer hover:bg-gray-50 transition-all duration-200 border-b border-gray-100 ${selectedAssets.has(asset.id) ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' : 'hover:shadow-sm'}`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={() => toggleSelectAsset(asset.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3">
                      <div className={`font-bold text-sm tracking-wide transition-colors duration-300 ${
                        asset.is_checked ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {asset.asset_code}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900 text-sm leading-tight">
                        {asset.name}
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 text-sm">{asset.model}</td>
                    <td className="p-3 text-gray-600 text-sm font-mono">{asset.serial}</td>
                    <td className="p-3 text-gray-600 truncate">{asset.tech_code}</td>
                    <td className="p-3 text-gray-600 truncate">{asset.department}</td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap shadow-sm ${getStatusColor(asset.status || '')}`}>
                          {asset.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 truncate" title={asset.location}>{asset.location}</td>
                    <td className="p-3 text-center sticky right-0 bg-white">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAsset(asset);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAssets.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Không tìm thấy tài sản nào</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AssetDetailModal
        asset={assetDetailModal.asset}
        isOpen={assetDetailModal.isOpen}
        onClose={() => setAssetDetailModal({ isOpen: false, asset: null, mode: 'view' })}
        mode={assetDetailModal.mode}
        onSave={handleAssetSave}
        onCheck={(assetId, checkedBy) => checkAssets([assetId], checkedBy)}
        onUncheck={(assetId) => uncheckAssets([assetId])}
      />

      <QRPrintModal
        assets={qrPrintModal.assets}
        isOpen={qrPrintModal.isOpen}
        onClose={() => setQrPrintModal({ isOpen: false, assets: [] })}
      />

      <ImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onImport={handleImportAssets}
        existingAssets={assets}
      />
      </div>
    </div>
  );
}
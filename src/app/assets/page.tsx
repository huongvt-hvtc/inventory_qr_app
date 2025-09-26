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
  FolderOpen,
  AlertCircle
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

  // Remove navigation scroll sync - not needed for new layout

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
  const [recheckConfirm, setRecheckConfirm] = useState<{
    isOpen: boolean;
    assets: AssetWithInventoryStatus[];
  }>({
    isOpen: false,
    assets: []
  });

  // Handle search and filter changes
  useEffect(() => {
    // If no search term and no filters, load all assets
    if (!searchTerm && departmentFilter === 'all' && statusFilter === 'all' && inventoryFilter === 'all') {
      loadAssets(true); // Load full list when no filters
      return;
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
  }, [searchTerm, departmentFilter, statusFilter, inventoryFilter, searchAssets, loadAssets]);

  // Use assets directly from hook (already filtered)
  const filteredAssets = assets;
  
  // Total stats (unfiltered) for dashboard
  const [totalStats, setTotalStats] = useState({
    total: 0,
    checked: 0,
    unchecked: 0
  });

  // Update total stats when assets change (from loadAssets, not searchAssets)
  useEffect(() => {
    if (!searchTerm && departmentFilter === 'all' && statusFilter === 'all' && inventoryFilter === 'all') {
      // Only update total stats when showing unfiltered data
      setTotalStats({
        total: assets.length,
        checked: assets.filter(a => a.is_checked).length,
        unchecked: assets.filter(a => !a.is_checked).length
      });
    }
  }, [assets, searchTerm, departmentFilter, statusFilter, inventoryFilter]);

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
      // Check if any selected assets are already checked
      const selectedAssetList = Array.from(selectedAssets).map(id => 
        assets.find(asset => asset.id === id)
      ).filter(Boolean) as AssetWithInventoryStatus[];
      
      const alreadyCheckedAssets = selectedAssetList.filter(asset => asset.is_checked);
      
      if (alreadyCheckedAssets.length > 0) {
        // Show confirmation dialog for re-checking
        setRecheckConfirm({
          isOpen: true,
          assets: alreadyCheckedAssets
        });
        return;
      }

      // Use real Gmail user name from AuthContext
      const userName = user.name || user.email || 'Unknown User';
      await checkAssets(Array.from(selectedAssets), userName);
      setSelectedAssets(new Set());
    } catch (error) {
      console.error('Error checking assets:', error);
    }
  };

  const handleConfirmRecheck = async () => {
    if (!user) return;

    try {
      const userName = user.name || user.email || 'Unknown User';
      await checkAssets(Array.from(selectedAssets), userName);
      setSelectedAssets(new Set());
      setRecheckConfirm({ isOpen: false, assets: [] });
      toast.success('Đã cập nhật lại kiểm kê cho các tài sản đã chọn');
    } catch (error) {
      console.error('Error rechecking assets:', error);
      toast.error('Có lỗi xảy ra khi kiểm kê lại');
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

  // Clear all filters and reload full assets
  const clearAllFilters = () => {
    setDepartmentFilter('all');
    setStatusFilter('all');
    setInventoryFilter('all');
    setSearchTerm('');
    // Reload full assets list
    loadAssets(true);
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Container - Compact & Professional */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 relative z-30">
        {/* Header Section - Matching QR Scanner Layout */}
        <div className="px-6 py-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-purple-600" />
              Quản lý tài sản
            </h1>

            {/* Dashboard Stats - Matching QR Scanner */}
            <div className="flex items-center gap-6 text-sm md:text-base border-b border-gray-100 pb-2">
            {/* Total Assets - Purple */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-semibold text-sm md:text-base">Tổng:</span>
              <span className="font-bold text-purple-600 text-lg md:text-xl">{loading ? '...' : totalStats.total}</span>
            </div>

            <div className="w-px h-5 bg-gray-300"></div>

            {/* Checked Assets - Green */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-semibold text-sm md:text-base">Đã kiểm:</span>
              <span className="font-bold text-green-600 text-lg md:text-xl">{loading ? '...' : totalStats.checked}</span>
            </div>

            <div className="w-px h-5 bg-gray-300"></div>

            {/* Unchecked Assets - Blue */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-semibold text-sm md:text-base">Chưa kiểm:</span>
              <span className="font-bold text-blue-600 text-lg md:text-xl">{loading ? '...' : totalStats.unchecked}</span>
            </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Professional Layout */}
        <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-100">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Primary Actions */}
              <button
                disabled={loading}
                onClick={handleCreateAsset}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Thêm mới
              </button>

              <button
                disabled={loading}
                onClick={() => setImportModal(true)}
                className="h-10 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                <Upload className="h-4 w-4" />
                Nhập
              </button>

              <button
                disabled={loading}
                onClick={handleExport}
                className="h-10 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                <Download className="h-4 w-4" />
                Xuất
              </button>
            </div>

            {/* Selection Actions (only when items selected) */}
            {selectedAssets.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 px-3 py-1 bg-gray-100 rounded-full">{selectedAssets.size} đã chọn</span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={loading}
                    onClick={handleCheckAssets}
                    className="h-10 px-4 bg-green-50 border border-green-300 hover:bg-green-100 text-green-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    <Check className="h-4 w-4" />
                    Check
                  </button>

                  <button
                    disabled={loading}
                    onClick={handleUncheckAssets}
                    className="h-10 px-4 bg-orange-50 border border-orange-300 hover:bg-orange-100 text-orange-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    <X className="h-4 w-4" />
                    Uncheck
                  </button>

                  <button
                    disabled={loading}
                    onClick={handlePrintQR}
                    className="h-10 px-4 bg-purple-50 border border-purple-300 hover:bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    <QrCode className="h-4 w-4" />
                    In QR
                  </button>

                  <button
                    disabled={loading}
                    onClick={handleDeleteAssets}
                    className="h-10 px-4 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-3">
            {/* Primary Actions */}
            <div className="flex items-center gap-2">
              <button
                disabled={loading}
                onClick={handleCreateAsset}
                className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Thêm mới
              </button>

              <button
                disabled={loading}
                onClick={() => setImportModal(true)}
                className="h-9 px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Upload className="h-4 w-4" />
                Nhập
              </button>

              <button
                disabled={loading}
                onClick={handleExport}
                className="h-9 px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Xuất
              </button>
            </div>

            {/* Selection Controls and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllAssets}
                  disabled={loading}
                  className="h-9 px-4 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {selectedAssets.size === filteredAssets.length && filteredAssets.length > 0 ? (
                    <>
                      <X className="h-3 w-3" />
                      Bỏ chọn
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      Chọn tất cả
                    </>
                  )}
                </button>
                
                {selectedAssets.size > 0 && (
                  <span className="text-sm font-medium text-gray-600 px-3 py-1 bg-gray-100 rounded-full">
                    {selectedAssets.size} đã chọn
                  </span>
                )}
              </div>
            </div>

            {/* Selection Actions */}
            {selectedAssets.size > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    disabled={loading}
                    onClick={handleCheckAssets}
                    className="h-9 px-3 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Check
                  </button>

                  <button
                    disabled={loading}
                    onClick={handleUncheckAssets}
                    className="h-9 px-3 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Uncheck
                  </button>

                  <button
                    disabled={loading}
                    onClick={handlePrintQR}
                    className="h-9 px-3 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <QrCode className="h-4 w-4" />
                    In QR
                  </button>

                  <button
                    disabled={loading}
                    onClick={handleDeleteAssets}
                    className="h-9 px-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm kiếm tài sản theo mã, tên, model, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
                className="w-full h-10 pl-12 pr-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              disabled={loading}
              className={`h-10 px-4 font-semibold text-sm rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md ${
                hasActiveFilters
                  ? 'bg-orange-500 text-white border border-orange-500 hover:bg-orange-600'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Lọc</span>
              {hasActiveFilters && (
                <span className="bg-white text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {[departmentFilter, statusFilter, inventoryFilter].filter(f => f !== 'all').length}
                </span>
              )}
            </button>
          </div>

          {/* Collapsible Advanced Filters */}
          {showFilters && (
            <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <select
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value as 'all' | 'checked' | 'unchecked')}
                  className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="all">Tất cả kiểm kê</option>
                  <option value="checked">Đã kiểm kê</option>
                  <option value="unchecked">Chưa kiểm kê</option>
                </select>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="all">Tất cả tình trạng</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {hasActiveFilters && `${[departmentFilter, statusFilter, inventoryFilter].filter(f => f !== 'all').length} bộ lọc đang áp dụng`}
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="h-9 px-4 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FilterX className="h-4 w-4" />
                      Bỏ lọc
                    </button>
                  )}

                  <button
                    onClick={() => setShowFilters(false)}
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Legend */}
        <div className="px-4 md:px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-8 text-sm font-medium text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full shadow-sm"></div>
              <span>Chưa kiểm kê</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded-full shadow-sm"></div>
              <span>Đã kiểm kê</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table - Optimized for maximum space */}
      <div className="flex-1 overflow-hidden pb-0 md:pb-0">
        {/* Loading State */}
        {loading && assets.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Đang tải dữ liệu...</span>
          </div>
        )}

        {/* Error State */}
        {error && assets.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Lỗi kết nối cơ sở dữ liệu</p>
            <p className="text-sm text-gray-400">Hiển thị dữ liệu mẫu cho demo</p>
          </div>
        )}

        {/* Table Container */}
        <div className="h-full overflow-hidden bg-white">
          <div className="h-full overflow-auto pb-20 md:pb-4 table-scroll-container" data-scroll="true">
            <table className="w-full table-fixed table-optimized">
              {/* Table Header - Sticky */}
              <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-20" style={{ position: 'sticky', top: 0 }}>
                <tr>
                  {/* Desktop Headers */}
                  <th className="hidden md:table-cell w-12 p-3 text-center text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>
                    <Eye className="h-4 w-4 mx-auto text-gray-600" />
                  </th>
                  <th className="hidden md:table-cell w-32 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>Mã tài sản</th>
                  <th className="hidden md:table-cell w-56 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>Tên tài sản</th>
                  <th className="hidden md:table-cell w-32 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>Model</th>
                  <th className="hidden md:table-cell w-32 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>Serial</th>
                  <th className="hidden md:table-cell w-24 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>Tech Code</th>
                  <th className="hidden md:table-cell w-32 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>Bộ phận</th>
                  <th className="hidden md:table-cell w-28 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50" style={{ backgroundColor: 'rgb(249 250 251)' }}>Tình trạng</th>

                  {/* Mobile Headers */}
                  <th className="md:hidden w-12 p-3 text-center text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>
                    <Eye className="h-4 w-4 mx-auto text-gray-600" />
                  </th>
                  <th className="md:hidden w-32 p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200" style={{ backgroundColor: 'rgb(249 250 251)' }}>Mã TS</th>
                  <th className="md:hidden p-3 text-left text-sm font-semibold text-gray-900 bg-gray-50" style={{ backgroundColor: 'rgb(249 250 251)' }}>Tên tài sản</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={(e) => {
                      // Prevent selection when clicking on the eye icon
                      if (!(e.target as HTMLElement).closest('.view-button')) {
                        toggleSelectAsset(asset.id);
                      }
                    }}
                    className={`cursor-pointer transition-colors ${
                      selectedAssets.has(asset.id) 
                        ? 'bg-yellow-100 border-l-4 border-yellow-600 shadow-sm hover:bg-yellow-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Desktop Row - View Button */}
                    <td className="hidden md:table-cell p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAsset(asset);
                        }}
                        className="view-button w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg flex items-center justify-center transition-colors group"
                        title="Xem chi tiết tài sản"
                      >
                        <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      <div className={`text-sm font-bold break-words ${
                        asset.is_checked ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {asset.asset_code}
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      <div className="text-sm font-medium text-gray-900 break-words leading-relaxed">
                        {asset.name}
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      <div className="text-sm text-gray-600 break-words">
                        {asset.model}
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      <div className="text-sm text-gray-600 font-mono break-words">
                        {asset.serial}
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      <div className="text-sm text-gray-600 break-words">
                        {asset.tech_code}
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      <div className="text-sm text-gray-600 break-words">
                        {asset.department}
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      <span className={`inline-flex items-center px-2.5 py-1 text-sm font-medium rounded-lg ${getStatusColor(asset.status || '')}`}>
                        {asset.status}
                      </span>
                    </td>

                    {/* Mobile Row - View Button */}
                    <td className="md:hidden p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewAsset(asset);
                        }}
                        className="view-button w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl flex items-center justify-center transition-colors group"
                        title="Xem chi tiết tài sản"
                      >
                        <Eye className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      </button>
                    </td>
                    <td className="md:hidden p-3">
                      <div className={`text-sm font-bold ${
                        asset.is_checked ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {asset.asset_code}
                      </div>
                    </td>
                    <td className="md:hidden p-3">
                      <div className="text-sm font-medium text-gray-900 leading-relaxed break-words">
                        {asset.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 break-words">
                        {asset.department} - {asset.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredAssets.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Không tìm thấy tài sản nào</p>
              </div>
            )}
          </div>
        </div>


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

      {/* Recheck Confirmation Dialog */}
      {recheckConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Xác nhận kiểm kê lại
                </h3>
                <p className="text-sm text-gray-600">
                  {recheckConfirm.assets.length} tài sản đã được kiểm kê
                </p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6 max-h-32 overflow-y-auto">
              {recheckConfirm.assets.map(asset => (
                <div key={asset.id} className="text-sm bg-gray-50 p-2 rounded">
                  <span className="font-medium">{asset.asset_code}</span> - {asset.name}
                  <div className="text-xs text-gray-500">
                    Đã kiểm: {asset.checked_by} • {asset.checked_at ? new Date(asset.checked_at).toLocaleString('vi-VN') : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-sm text-gray-700 mb-6">
              Bạn có muốn kiểm kê lại các tài sản này không? Thời gian và người kiểm kê sẽ được cập nhật.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRecheckConfirm({ isOpen: false, assets: [] })}
                className="h-9 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmRecheck}
                className="h-9 px-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Kiểm kê lại
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
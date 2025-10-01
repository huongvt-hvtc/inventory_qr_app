'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package,
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
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useRecentScans } from '@/contexts/RecentScansContext';
import { useRefresh } from '@/contexts/RefreshContext';
import { debounce } from '@/lib/utils';
import AssetDetailModal from '@/components/assets/AssetDetailModal';
import QRPrintModal from '@/components/assets/QRPrintModal';
import ImportModal from '@/components/assets/ImportModal';
import { WiFiIndicator } from '@/components/WiFiIndicator';
import { exportToExcel } from '@/lib/excel';
import { Asset, AssetWithInventoryStatus } from '@/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader';

export default function AssetsPage() {
  const { user, loading: authLoading } = useAuth();
  const { setRefreshFunction } = useRefresh();

  // PWA Debug: Check authentication and redirect if needed
  useEffect(() => {
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (!authLoading && !user && isStandalone) {
      console.log('🔍 PWA Debug - No user in standalone mode, redirecting to login');
      window.location.href = '/';
    }
  }, [user, authLoading]);
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

  const { addToRecentScans } = useRecentScans();

  // Keep track of total assets for dashboard stats (unfiltered)
  const [allAssets, setAllAssets] = useState<AssetWithInventoryStatus[]>([]);

  // Use ref to track previous assets to detect real changes (not filter changes)
  const prevAssetsRef = useRef<AssetWithInventoryStatus[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');
  const trimmedSearchInput = searchTerm.trim();
  const isSearchActive = submittedSearchTerm.length > 0;
  const isCancelMode = isSearchActive && trimmedSearchInput === submittedSearchTerm;
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const refreshStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // New confirmation dialogs
  const [checkConfirm, setCheckConfirm] = useState<{
    isOpen: boolean;
    assets: AssetWithInventoryStatus[];
    alreadyChecked: AssetWithInventoryStatus[];
  }>({
    isOpen: false,
    assets: [],
    alreadyChecked: []
  });

  const [uncheckConfirm, setUncheckConfirm] = useState<{
    isOpen: boolean;
    count: number;
  }>({
    isOpen: false,
    count: 0
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    count: number;
  }>({
    isOpen: false,
    count: 0
  });

  // Handle search and filter changes with debouncing to prevent multiple rapid calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const filters = {
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        inventory_status: inventoryFilter
      };

      if (!submittedSearchTerm && !filters.department && !filters.status && inventoryFilter === 'all') {
        loadAssets(true);
        return;
      }

      searchAssets(submittedSearchTerm, filters);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [submittedSearchTerm, departmentFilter, statusFilter, inventoryFilter]);

  const handleSearchSubmit = () => {
    const trimmedTerm = searchTerm.trim();

    if (isCancelMode) {
      setSearchTerm('');
      setSubmittedSearchTerm('');
      return;
    }

    if (!trimmedTerm) {
      return;
    }

    setSubmittedSearchTerm(trimmedTerm);
    setSearchTerm(trimmedTerm);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    
      handleSearchSubmit();
    }
  };


  // Toast notification for selection count
  useEffect(() => {
    let toastId: string | undefined;

    if (selectedAssets.size > 0) {
      toastId = toast.success(`Đã chọn ${selectedAssets.size} tài sản`, {
        duration: 2000,
        position: 'top-right',
      });
    }

    return () => {
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, [selectedAssets.size]);

  // Update allAssets only when loading completes AND no filters are active (debounced)
  useEffect(() => {
    const noFiltersActive = !searchTerm && departmentFilter === 'all' && statusFilter === 'all' && inventoryFilter === 'all';

    // Debounce this update to prevent rapid changes when multiple filters change
    const timeoutId = setTimeout(() => {
      // Only update when loading is done, no filters active, and we have data
      if (!loading && noFiltersActive && assets.length > 0 && allAssets.length !== assets.length) {
        setAllAssets([...assets]);
      }
    }, 100); // Short debounce for allAssets update

    return () => clearTimeout(timeoutId);
  }, [loading, searchTerm, departmentFilter, statusFilter, inventoryFilter, allAssets.length]); // Track loading state and filters

  // Use assets directly from hook (already filtered)
  const filteredAssets = assets;
  
  // Memoized dashboard stats calculation - only depends on allAssets to prevent reload on filter changes
  const dashboardStats = useMemo(() => {
    // Only use allAssets for dashboard stats, never filtered assets
    if (allAssets.length > 0) {
      return {
        total: allAssets.length,
        checked: allAssets.filter(a => a.is_checked).length,
        unchecked: allAssets.filter(a => !a.is_checked).length
      };
    }
    // Fallback to current assets only during initial load when allAssets not set
    return {
      total: assets.length || 0,
      checked: assets.filter(a => a.is_checked).length || 0,
      unchecked: assets.filter(a => !a.is_checked).length || 0
    };
  }, [allAssets]); // Only depend on allAssets - remove loading dependency

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

    const selectedAssetList = Array.from(selectedAssets).map(id =>
      assets.find(asset => asset.id === id)
    ).filter(Boolean) as AssetWithInventoryStatus[];

    const alreadyCheckedAssets = selectedAssetList.filter(asset => asset.is_checked);

    // Show confirmation dialog
    setCheckConfirm({
      isOpen: true,
      assets: selectedAssetList,
      alreadyChecked: alreadyCheckedAssets
    });
  };

  const handleConfirmRecheck = async () => {
    if (!user) return;

    try {
      const userName = user.name || user.email || 'Unknown User';
      await checkAssets(Array.from(selectedAssets), userName);
      setSelectedAssets(new Set());
      setRecheckConfirm({ isOpen: false, assets: [] });
      // Toast được hiển thị bởi useAssets hook, không cần duplicate
    } catch (error) {
      console.error('Error rechecking assets:', error);
      toast.error('Có lỗi xảy ra khi kiểm kê lại');
    }
  };

  const handleUncheckAssets = async () => {
    if (selectedAssets.size === 0) return;

    setUncheckConfirm({
      isOpen: true,
      count: selectedAssets.size
    });
  };

  const handleDeleteAssets = async () => {
    if (selectedAssets.size === 0) return;

    setDeleteConfirm({
      isOpen: true,
      count: selectedAssets.size
    });
  };

  const handleRefresh = useCallback(async () => {
    if (refreshStatus === 'loading') return;

    if (refreshStatusTimeoutRef.current) {
      clearTimeout(refreshStatusTimeoutRef.current);
      refreshStatusTimeoutRef.current = null;
    }

    setRefreshStatus('loading');
    const toastId = toast.loading('Đang cập nhật dữ liệu...');

    try {
      await loadAssets(true); // Force refresh bypassing cache
      toast.success('Đã cập nhật dữ liệu mới nhất', { id: toastId });
      setRefreshStatus('success');
      refreshStatusTimeoutRef.current = setTimeout(() => {
        setRefreshStatus('idle');
        refreshStatusTimeoutRef.current = null;
      }, 2200);
    } catch (error) {
      console.error('Error refreshing assets:', error);
      toast.error('Có lỗi xảy ra khi cập nhật dữ liệu', { id: toastId });
      setRefreshStatus('error');
      refreshStatusTimeoutRef.current = setTimeout(() => {
        setRefreshStatus('idle');
        refreshStatusTimeoutRef.current = null;
      }, 3200);
    }
  }, [refreshStatus, loadAssets]);

  // Register refresh function for network status component
  useEffect(() => {
    setRefreshFunction(() => handleRefresh);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction, handleRefresh]);

  // Clear any pending timers on unmount
  useEffect(() => {
    return () => {
      if (refreshStatusTimeoutRef.current) {
        clearTimeout(refreshStatusTimeoutRef.current);
        refreshStatusTimeoutRef.current = null;
      }
    };
  }, []);

  // Actual execution functions
  const executeCheckAssets = async (checkOnlyUnchecked: boolean = false) => {
    if (!user) return;

    try {
      const assetsToCheck = checkOnlyUnchecked
        ? checkConfirm.assets.filter(asset => !asset.is_checked)
        : checkConfirm.assets;

      if (assetsToCheck.length === 0) {
        toast('Không có tài sản nào cần kiểm kê');
        setCheckConfirm({ isOpen: false, assets: [], alreadyChecked: [] });
        return;
      }

      const userName = user.name || user.email || 'Unknown User';
      await checkAssets(assetsToCheck.map(a => a.id), userName);

      // Add checked assets to recent scans (async)
      assetsToCheck.forEach(asset => {
        addToRecentScans({
          ...asset,
          is_checked: true,
          checked_by: userName,
          checked_at: new Date().toISOString()
        }).catch(err => console.error('Failed to add to recent scans:', err));
      });

      setSelectedAssets(new Set());
      setCheckConfirm({ isOpen: false, assets: [], alreadyChecked: [] });
    } catch (error) {
      console.error('Error checking assets:', error);
    }
  };

  const executeUncheckAssets = async () => {
    try {
      await uncheckAssets(Array.from(selectedAssets));
      setSelectedAssets(new Set());
      setUncheckConfirm({ isOpen: false, count: 0 });
    } catch (error) {
      console.error('Error unchecking assets:', error);
    }
  };

  const executeDeleteAssets = async () => {
    const assetCount = selectedAssets.size;
    if (assetCount === 0) return;

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
      setDeleteConfirm({ isOpen: false, count: 0 });

      // Single summary notification
      toast.success(`✅ Đã xóa ${assetCount} tài sản thành công`);
    } catch (error) {
      // Dismiss progress toast on error
      if (toastId) toast.dismiss(toastId);

      console.error('Error deleting assets:', error);
      toast.error('❌ Có lỗi xảy ra khi xóa tài sản');
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
    // Set all filters at once to trigger useEffect only once
    setDepartmentFilter('all');
    setStatusFilter('all');
    setInventoryFilter('all');
    setSearchTerm('');
    setSubmittedSearchTerm('');
    // Don't call loadAssets manually - let useEffect handle it
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

  // Get unique departments and statuses for filters from all assets
  const totalAssets = allAssets.length > 0 ? allAssets : assets;
  const departments = Array.from(new Set(totalAssets.map(a => a.department).filter(dept => dept && dept.trim() !== ''))) as string[];
  const statuses = Array.from(new Set(totalAssets.map(a => a.status).filter(status => status && status.trim() !== ''))) as string[];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Company Switcher & Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 relative z-30">
        <div className="px-6 py-3">
          <PageHeader
            title="Quản lý tài sản"
            actions={
              <div className="flex items-center gap-3">
                <WiFiIndicator />
                <div className="flex flex-col items-end gap-1">
                  <button
                    disabled={loading || refreshStatus === 'loading'}
                    onClick={handleRefresh}
                    className="h-10 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg active:shadow-sm touch-manipulation"
                    title="Làm mới dữ liệu từ server"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshStatus === 'loading' ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">
                      {refreshStatus === 'loading'
                        ? 'Đang làm mới...'
                        : refreshStatus === 'success'
                          ? 'Đã cập nhật'
                          : refreshStatus === 'error'
                            ? 'Thử lại'
                            : 'Làm mới'}
                    </span>
                    <span className="sm:hidden">
                      {refreshStatus === 'loading'
                        ? 'Đang...'
                        : refreshStatus === 'success'
                          ? 'Đã xong'
                          : refreshStatus === 'error'
                            ? 'Lỗi'
                            : 'Làm mới'}
                    </span>
                  </button>
                  {refreshStatus !== 'idle' && (
                    <span className={`sm:hidden text-xs ${refreshStatus === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                      {refreshStatus === 'loading'
                        ? 'Đang cập nhật dữ liệu...'
                        : refreshStatus === 'success'
                          ? 'Đã cập nhật dữ liệu mới nhất'
                          : 'Có lỗi xảy ra khi cập nhật dữ liệu'}
                    </span>
                  )}
                </div>
              </div>
            }
          />

          {/* Dashboard Stats - Matching QR Scanner */}
          <div className="flex items-center gap-6 text-sm md:text-base border-b border-gray-100 pb-2 mt-4">
            {/* Total Assets - Purple */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-semibold text-sm md:text-base">Tổng:</span>
              <span className="font-bold text-purple-600 text-lg md:text-xl">{dashboardStats.total}</span>
            </div>

            <div className="w-px h-5 bg-gray-300"></div>

            {/* Checked Assets - Green */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-semibold text-sm md:text-base">Đã kiểm:</span>
              <span className="font-bold text-green-600 text-lg md:text-xl">{dashboardStats.checked}</span>
            </div>

            <div className="w-px h-5 bg-gray-300"></div>

            {/* Unchecked Assets - Blue */}
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-semibold text-sm md:text-base">Chưa kiểm:</span>
              <span className="font-bold text-blue-600 text-lg md:text-xl">{dashboardStats.unchecked}</span>
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
                className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[90px] justify-center"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>

              <button
                disabled={loading}
                onClick={() => setImportModal(true)}
                className="h-11 px-5 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[100px] justify-center"
              >
                <Upload className="h-4 w-4" />
                Nhập
              </button>

              <button
                disabled={loading}
                onClick={handleExport}
                className="h-11 px-5 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[100px] justify-center"
              >
                <Download className="h-4 w-4" />
                Xuất
              </button>


              {/* Select All Button - Same row as primary actions */}
              <button
                onClick={selectAllAssets}
                disabled={loading}
                className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[130px] justify-center focus:outline-none focus:ring-0"
              >
                {selectedAssets.size === filteredAssets.length && filteredAssets.length > 0 ? (
                  <>
                    <X className="h-4 w-4" />
                    Bỏ chọn tất cả
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Chọn tất cả
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons (only when items selected) */}
            {selectedAssets.size > 0 && (
              <div className="flex items-center gap-3">
                <button
                  disabled={loading}
                  onClick={handleCheckAssets}
                  className="h-11 px-5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[100px] justify-center"
                >
                  <Check className="h-4 w-4" />
                  Check
                </button>

                <button
                  disabled={loading}
                  onClick={handleUncheckAssets}
                  className="h-11 px-5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[110px] justify-center"
                >
                  <X className="h-4 w-4" />
                  Uncheck
                </button>

                <button
                  disabled={loading}
                  onClick={handlePrintQR}
                  className="h-11 px-5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[100px] justify-center"
                >
                  <QrCode className="h-4 w-4" />
                  In QR
                </button>

                <button
                  disabled={loading}
                  onClick={handleDeleteAssets}
                  className="h-11 px-5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[100px] justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
              </div>
            )}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-3">
            {/* Primary Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={loading}
                onClick={handleCreateAsset}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[75px] justify-center"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>

              <button
                disabled={loading}
                onClick={() => setImportModal(true)}
                className="h-10 px-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[70px] justify-center"
              >
                <Upload className="h-4 w-4" />
                Nhập
              </button>

              <button
                disabled={loading}
                onClick={handleExport}
                className="h-10 px-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[70px] justify-center"
              >
                <Download className="h-4 w-4" />
                Xuất
              </button>


              <button
                onClick={selectAllAssets}
                disabled={loading}
                className="h-10 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg min-w-[85px] justify-center focus:outline-none focus:ring-0"
              >
                {selectedAssets.size === filteredAssets.length && filteredAssets.length > 0 ? (
                  <>
                    Bỏ chọn
                  </>
                ) : (
                  <>
                    Chọn hết
                  </>
                )}
              </button>
            </div>

            {/* Selection Actions */}
            {selectedAssets.size > 0 && (
              <div className="grid grid-cols-4 gap-2">
                <button
                  disabled={loading}
                  onClick={handleCheckAssets}
                  className="h-10 px-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <Check className="h-4 w-4" />
                  Check
                </button>

                <button
                  disabled={loading}
                  onClick={handleUncheckAssets}
                  className="h-10 px-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <X className="h-4 w-4" />
                  Uncheck
                </button>

                <button
                  disabled={loading}
                  onClick={handlePrintQR}
                  className="h-10 px-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <QrCode className="h-4 w-4" />
                  In QR
                </button>

                <button
                  disabled={loading}
                  onClick={handleDeleteAssets}
                  className="h-10 px-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Tìm kiếm tài sản theo mã, tên, model, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                disabled={loading}
                className="flex-1 h-10 px-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm"
              />
              <button
                type="button"
                onClick={handleSearchSubmit}
                disabled={loading || (!isSearchActive && trimmedSearchInput === '')}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md disabled:opacity-50" aria-label={isCancelMode ? 'Bỏ tìm kiếm' : 'Thực hiện tìm kiếm'}
              >
                {isCancelMode ? 'Bỏ Tìm' : 'Tìm'}
              </button>
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

        {/* Status Legend */}
        <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-200">
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
          <div className="h-full overflow-auto pb-48 md:pb-6 table-scroll-container" data-scroll="true">
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
                        ? 'bg-indigo-100 shadow-sm hover:bg-indigo-150'
                        : 'hover:bg-gray-50'
                    }`}
                    style={selectedAssets.has(asset.id) ? {
                      borderLeft: '4px solid rgb(79 70 229)', // indigo-600
                      borderLeftWidth: '4px !important'
                    } : {}}
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
        onCheck={async (assetId, checkedBy) => {
          await checkAssets([assetId], checkedBy);
          // Add to recent scans after checking (async)
          const asset = assets.find(a => a.id === assetId);
          if (asset) {
            addToRecentScans({
              ...asset,
              is_checked: true,
              checked_by: checkedBy,
              checked_at: new Date().toISOString()
            }).catch(err => console.error('Failed to add to recent scans:', err));
          }
        }}
        onUncheck={(assetId) => uncheckAssets([assetId])}
        existingDepartments={departments}
        existingStatuses={statuses}
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

      {/* Check Confirmation Dialog */}
      {checkConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Xác nhận kiểm kê
                  </h3>
                  <p className="text-sm text-gray-600">
                    {checkConfirm.assets.length} tài sản được chọn
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
              {checkConfirm.alreadyChecked.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                    </div>
                    <p className="text-sm font-semibold text-amber-800">
                      {checkConfirm.alreadyChecked.length} tài sản đã được kiểm kê:
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-amber-100">
                    {checkConfirm.alreadyChecked.map(asset => (
                      <div key={asset.id} className="flex items-start gap-3 p-2 bg-white rounded-lg border border-amber-200">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-amber-900 text-sm break-words">{asset.asset_code}</div>
                          <div className="text-xs text-amber-700 break-words leading-relaxed mt-1">{asset.name}</div>
                        </div>
                        <div className="text-xs text-amber-600 font-medium whitespace-nowrap">
                          {asset.checked_by}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-base text-gray-700 font-medium">
                {checkConfirm.alreadyChecked.length > 0
                  ? 'Bạn muốn thực hiện như thế nào?'
                  : `Bạn có chắc muốn kiểm kê ${checkConfirm.assets.length} tài sản này không?`
                }
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setCheckConfirm({ isOpen: false, assets: [], alreadyChecked: [] })}
                  className="h-11 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  Hủy bỏ
                </button>

                {checkConfirm.alreadyChecked.length > 0 && (
                  <button
                    onClick={() => executeCheckAssets(true)}
                    className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    Chỉ kiểm kê chưa kiểm
                  </button>
                )}

                <button
                  onClick={() => executeCheckAssets(false)}
                  className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {checkConfirm.alreadyChecked.length > 0 ? 'Kiểm kê lại tất cả' : 'Xác nhận kiểm kê'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uncheck Confirmation Dialog */}
      {uncheckConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <X className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Xác nhận bỏ kiểm kê
                </h3>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Bạn có chắc muốn bỏ kiểm kê {uncheckConfirm.count} tài sản này không?
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUncheckConfirm({ isOpen: false, count: 0 })}
                className="h-9 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={executeUncheckAssets}
                className="h-9 px-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Xác nhận bỏ kiểm kê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Xác nhận xóa tài sản
                </h3>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              <span className="text-red-600 font-semibold">⚠️ Cảnh báo:</span> Bạn có chắc muốn xóa {deleteConfirm.count} tài sản này không?
              <br />
              <span className="text-red-600">Hành động này không thể hoàn tác!</span>
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, count: 0 })}
                className="h-9 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={executeDeleteAssets}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

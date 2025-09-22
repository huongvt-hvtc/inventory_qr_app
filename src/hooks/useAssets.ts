'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, supabase } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offline-storage';
import type { AssetWithInventoryStatus, AssetFilters } from '@/types';
import toast from 'react-hot-toast';

const ASSETS_CACHE_KEY = 'assets_cache';
const CACHE_EXPIRY_KEY = 'assets_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAssets() {
  const isInitialized = useRef(false);
  const realtimeSubscription = useRef<any>(null);

  // Initialize state with cached data if available and valid
  const [assets, setAssets] = useState<AssetWithInventoryStatus[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem(ASSETS_CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

        if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
          const parsedData = JSON.parse(cachedData);
          // Mark as initialized if we have cached data
          setTimeout(() => { isInitialized.current = true; }, 0);
          return parsedData;
        }
      } catch (error) {
        console.error('Error loading cached assets:', error);
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(() => {
    // Only show loading if we don't have cached data
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem(ASSETS_CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

        if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
          return false; // Don't show loading if we have cached data
        }
      } catch (error) {
        console.error('Error checking cached assets:', error);
      }
    }
    return true;
  });

  const [error, setError] = useState<string | null>(null);

  // Helper function to clear cache
  const clearCache = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ASSETS_CACHE_KEY);
        localStorage.removeItem(CACHE_EXPIRY_KEY);
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  };

  // Helper function to cache assets data
  const cacheAssets = (data: AssetWithInventoryStatus[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      } catch (error) {
        console.error('Error caching assets:', error);
      }
    }
  };

  const loadAssets = async (forceRefresh = false) => {
    // If offline, load from offline storage
    if (!navigator.onLine) {
      try {
        setLoading(true);
        setError(null);
        const offlineData = await offlineStorage.getOfflineAssets();
        if (offlineData.length > 0) {
          setAssets(offlineData);
          console.log('📴 Loaded assets from offline storage');
        }
        setLoading(false);
        return;
      } catch (error) {
        console.error('Error loading offline assets:', error);
        setError('Failed to load offline assets');
        setLoading(false);
        return;
      }
    }

    // Check if we have valid cached data and not forcing refresh
    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem(ASSETS_CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);

        if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
          const parsedData = JSON.parse(cachedData);
          setAssets(parsedData);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error loading cached assets:', error);
      }
    }

    try {
      setLoading(true);
      setError(null);
      const data = await db.getAssets();
      setAssets(data);
      cacheAssets(data);

      // Store assets offline for future offline access
      await offlineStorage.storeAssetsOffline(data);
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Failed to load assets');
      // Fallback to mock data for demo
      setAssets([
        {
          id: '1',
          asset_code: 'IT001',
          name: 'Dell Laptop Inspiron 15',
          model: 'Inspiron 15 3000',
          serial: 'DL123456789',
          tech_code: 'TECH001',
          department: 'IT Department',
          status: 'Đang sử dụng',
          location: 'Tầng 2 - Phòng IT',
          qr_generated: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_checked: true,
          checked_by: 'Nguyễn Văn A',
          checked_at: '2024-09-20T10:30:00Z'
        },
        {
          id: '2',
          asset_code: 'IT002',
          name: 'HP Printer LaserJet',
          model: 'LaserJet Pro MFP M428fdw',
          serial: 'HP987654321',
          tech_code: 'TECH002',
          department: 'IT Department',
          status: 'Tốt',
          location: 'Tầng 1 - Khu vực in ấn',
          qr_generated: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_checked: false,
          checked_by: undefined,
          checked_at: undefined
        },
        {
          id: '3',
          asset_code: 'HR001',
          name: 'Canon Camera EOS',
          model: 'EOS 80D',
          serial: 'CN456789123',
          tech_code: 'TECH003',
          department: 'HR Department',
          status: 'Tốt',
          location: 'Tầng 3 - Phòng HR',
          qr_generated: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_checked: true,
          checked_by: 'Trần Thị B',
          checked_at: '2024-09-19T14:15:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const searchAssets = useCallback(async (query: string, filters: Partial<AssetFilters> = {}) => {
    try {
      setLoading(true);
      const data = await db.searchAssets(query, {
        department: filters.department,
        status: filters.status,
        location: filters.location,
        inventory_status: filters.inventory_status
      });
      setAssets(data);
      // Don't cache search results, only cache full asset list
    } catch (err) {
      console.error('Error searching assets:', err);
      toast.error('Lỗi tìm kiếm tài sản');
      // Keep existing data if search fails
    } finally {
      setLoading(false);
    }
  }, []);

  const createAsset = async (assetData: Omit<AssetWithInventoryStatus, 'id' | 'created_at' | 'updated_at' | 'qr_generated' | 'is_checked'>) => {
    try {
      const newAsset = await db.createAsset(assetData);
      toast.success('Đã thêm tài sản thành công');
      await loadAssets(true); // Force refresh the list
      return newAsset;
    } catch (err) {
      console.error('Error creating asset:', err);
      toast.error('Lỗi tạo tài sản');
      throw err;
    }
  };

  const updateAsset = async (id: string, updates: Partial<AssetWithInventoryStatus>) => {
    try {
      const updatedAsset = await db.updateAsset(id, updates);
      // Don't show toast here - let the calling component handle it
      await loadAssets(true); // Force refresh the list
      return updatedAsset;
    } catch (err) {
      console.error('Error updating asset:', err);
      toast.error('Lỗi cập nhật tài sản');
      throw err;
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await db.deleteAsset(id);
      toast.success('Đã xóa tài sản');
      await loadAssets(true); // Force refresh the list
    } catch (err) {
      console.error('Error deleting asset:', err);
      toast.error('Lỗi xóa tài sản');
      throw err;
    }
  };

  // Silent delete for bulk operations - no individual toast notifications
  const deleteAssetSilent = async (id: string) => {
    try {
      await db.deleteAsset(id);
    } catch (err) {
      console.error('Error deleting asset:', err);
      throw err;
    }
  };

  const bulkCreateAssets = async (assetsData: Omit<AssetWithInventoryStatus, 'id' | 'created_at' | 'updated_at' | 'qr_generated' | 'is_checked'>[]) => {
    let toastId: string | null = null;

    try {
      // Show progress toast for large imports
      if (assetsData.length > 5) {
        toastId = toast.loading(`Đang import ${assetsData.length} tài sản... 0%`, { duration: Infinity });
      }

      // Filter out all fields that don't belong in assets table
      const cleanAssetsData = assetsData.map((asset, index) => {
        // Update progress for data processing
        if (toastId && assetsData.length > 5) {
          const progress = Math.round(((index + 1) / assetsData.length) * 50); // First 50% for processing
          toast.loading(`Đang xử lý dữ liệu... ${progress}%`, { id: toastId });
        }

        console.log('🔍 Original asset from import:', asset);

        // Explicitly construct the clean asset object to ensure all fields are included
        const cleanAsset = {
          asset_code: asset.asset_code || '',
          name: asset.name || '',
          model: asset.model || '',
          serial: asset.serial || '',
          tech_code: asset.tech_code || '',
          department: asset.department || '',
          status: asset.status || '',
          location: asset.location || '',
          notes: asset.notes || ''
        };

        console.log('✨ Cleaned asset for database:', cleanAsset);
        return cleanAsset;
      });

      // Update progress for database operation
      if (toastId) {
        toast.loading(`Đang lưu vào cơ sở dữ liệu... 75%`, { id: toastId });
      }

      const newAssets = await db.bulkCreateAssets(cleanAssetsData);

      // Update progress for final step
      if (toastId) {
        toast.loading(`Đang cập nhật danh sách... 90%`, { id: toastId });
      }

      await loadAssets(true); // Force refresh the list

      // Dismiss progress toast and show success
      if (toastId) {
        toast.dismiss(toastId);
      }

      toast.success(`✅ Đã import ${newAssets.length} tài sản thành công`);
      return newAssets;
    } catch (err) {
      // Dismiss progress toast on error
      if (toastId) toast.dismiss(toastId);

      console.error('Error bulk creating assets:', err);
      toast.error('❌ Lỗi import tài sản');
      throw err;
    }
  };

  const importAssetsWithOverwrite = async (assetsData: Omit<AssetWithInventoryStatus, 'id' | 'created_at' | 'updated_at' | 'qr_generated' | 'is_checked'>[], duplicates: { asset: any; existingAsset: AssetWithInventoryStatus }[]) => {
    let toastId: string | null = null;

    try {
      let createdCount = 0;
      let updatedCount = 0;
      const totalOperations = (assetsData.length > 0 ? 1 : 0) + duplicates.length;
      let completedOperations = 0;

      // Show initial progress toast
      toastId = toast.loading('Đang import tài sản... 0%', { duration: Infinity });

      // First, create new assets (non-duplicates) - this is one operation
      if (assetsData.length > 0) {
        const cleanAssetsData = assetsData.map(asset => ({
          asset_code: asset.asset_code || '',
          name: asset.name || '',
          model: asset.model || '',
          serial: asset.serial || '',
          tech_code: asset.tech_code || '',
          department: asset.department || '',
          status: asset.status || '',
          location: asset.location || '',
          notes: asset.notes || ''
        }));

        const newAssets = await db.bulkCreateAssets(cleanAssetsData);
        createdCount = newAssets.length;
        completedOperations++;

        // Update progress
        const progress = Math.round((completedOperations / totalOperations) * 100);
        toast.loading(`Đang import tài sản... ${progress}% (${createdCount} tài sản mới)`, { id: toastId });
      }

      // Then, update existing assets (duplicates) - each update is one operation
      for (let i = 0; i < duplicates.length; i++) {
        const duplicate = duplicates[i];
        const cleanAsset = {
          asset_code: duplicate.asset.asset_code || '',
          name: duplicate.asset.name || '',
          model: duplicate.asset.model || '',
          serial: duplicate.asset.serial || '',
          tech_code: duplicate.asset.tech_code || '',
          department: duplicate.asset.department || '',
          status: duplicate.asset.status || '',
          location: duplicate.asset.location || '',
          notes: duplicate.asset.notes || ''
        };

        await updateAsset(duplicate.existingAsset.id, cleanAsset);
        updatedCount++;
        completedOperations++;

        // Update progress for each duplicate update
        const progress = Math.round((completedOperations / totalOperations) * 100);
        const statusText = [];
        if (createdCount > 0) statusText.push(`${createdCount} mới`);
        if (updatedCount > 0) statusText.push(`${updatedCount} cập nhật`);

        toast.loading(`Đang import tài sản... ${progress}% (${statusText.join(', ')})`, { id: toastId });
      }

      // Dismiss progress toast
      toast.dismiss(toastId);

      // Show final success message
      const totalMessage = [];
      if (createdCount > 0) totalMessage.push(`${createdCount} tài sản mới`);
      if (updatedCount > 0) totalMessage.push(`${updatedCount} tài sản cập nhật`);

      toast.success(`✅ Hoàn thành import: ${totalMessage.join(', ')}`);
      await loadAssets(true); // Force refresh the list

      return { created: createdCount, updated: updatedCount };
    } catch (err) {
      // Dismiss progress toast on error
      if (toastId) toast.dismiss(toastId);

      console.error('Error importing assets with overwrite:', err);
      toast.error('❌ Lỗi import tài sản');
      throw err;
    }
  };

  const checkAssets = async (assetIds: string[], checkedBy: string) => {
    let toastId: string | null = null;

    try {
      const assetCount = assetIds.length;

      // Show progress toast for multiple checks
      if (assetCount > 3) {
        toastId = toast.loading(`Đang kiểm kê tài sản... 0% (0/${assetCount})`, { duration: Infinity });
      }

      // If offline, handle differently
      if (!navigator.onLine) {
        for (let i = 0; i < assetIds.length; i++) {
          const assetId = assetIds[i];
          const asset = assets.find(a => a.id === assetId);
          if (asset) {
            const success = await offlineStorage.scanAssetOffline(asset.asset_code, checkedBy, 'check');
            if (!success) {
              toast.error(`⚠️ Xung đột dữ liệu cho tài sản ${asset.asset_code}`);
            }
          }

          // Update progress
          if (toastId) {
            const progress = Math.round(((i + 1) / assetCount) * 100);
            toast.loading(`Đang lưu offline... ${progress}% (${i + 1}/${assetCount})`, { id: toastId });
          }
        }

        // Refresh from offline storage
        await loadAssets();

        if (toastId) toast.dismiss(toastId);
        toast.success('📴 Đã lưu offline - Sẽ đồng bộ khi có internet');
        return;
      }

      // Online mode - original logic
      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
          await db.createInventoryRecord({
            asset_id: assetId,
            asset_code: asset.asset_code,
            checked_by: checkedBy,
            checked_at: new Date().toISOString()
          });
        }

        // Update progress
        if (toastId) {
          const progress = Math.round(((i + 1) / assetCount) * 80); // 80% for checking
          toast.loading(`Đang kiểm kê tài sản... ${progress}% (${i + 1}/${assetCount})`, { id: toastId });
        }
      }

      // Update progress for list refresh
      if (toastId) {
        toast.loading(`Đang cập nhật danh sách... 90%`, { id: toastId });
      }

      await loadAssets(true); // Force refresh the list

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      toast.success(assetIds.length === 1 ? '✅ Đã đánh dấu kiểm kê' : `✅ Đã check ${assetIds.length} tài sản thành công`);
    } catch (err) {
      // Dismiss progress toast on error
      if (toastId) toast.dismiss(toastId);

      console.error('Error checking assets:', err);
      toast.error('❌ Lỗi check tài sản');
      throw err;
    }
  };

  const uncheckAssets = async (assetIds: string[]) => {
    let toastId: string | null = null;

    try {
      const assetCount = assetIds.length;

      // Show progress toast for multiple unchecks
      if (assetCount > 3) {
        toastId = toast.loading(`Đang bỏ kiểm kê tài sản... 0% (0/${assetCount})`, { duration: Infinity });
      }

      // If offline, handle differently
      if (!navigator.onLine) {
        for (let i = 0; i < assetIds.length; i++) {
          const assetId = assetIds[i];
          const asset = assets.find(a => a.id === assetId);
          if (asset) {
            const success = await offlineStorage.scanAssetOffline(asset.asset_code, 'system', 'uncheck');
            if (!success) {
              toast.error(`⚠️ Xung đột dữ liệu cho tài sản ${asset.asset_code}`);
            }
          }

          // Update progress
          if (toastId) {
            const progress = Math.round(((i + 1) / assetCount) * 100);
            toast.loading(`Đang lưu offline... ${progress}% (${i + 1}/${assetCount})`, { id: toastId });
          }
        }

        // Refresh from offline storage
        await loadAssets();

        if (toastId) toast.dismiss(toastId);
        toast.success('📴 Đã lưu offline - Sẽ đồng bộ khi có internet');
        return;
      }

      // Online mode - original logic
      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        await db.deleteInventoryRecord(assetId);

        // Update progress
        if (toastId) {
          const progress = Math.round(((i + 1) / assetCount) * 80); // 80% for unchecking
          toast.loading(`Đang bỏ kiểm kê tài sản... ${progress}% (${i + 1}/${assetCount})`, { id: toastId });
        }
      }

      // Update progress for list refresh
      if (toastId) {
        toast.loading(`Đang cập nhật danh sách... 90%`, { id: toastId });
      }

      await loadAssets(true); // Force refresh the list

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      toast.success(assetIds.length === 1 ? '✅ Đã bỏ đánh dấu kiểm kê' : `✅ Đã uncheck ${assetIds.length} tài sản thành công`);
    } catch (err) {
      // Dismiss progress toast on error
      if (toastId) toast.dismiss(toastId);

      console.error('Error unchecking assets:', err);
      toast.error('❌ Lỗi uncheck tài sản');
      throw err;
    }
  };

  // Offline-aware update function
  const updateAssetOffline = async (id: string, updates: Partial<AssetWithInventoryStatus>, userId: string) => {
    if (!navigator.onLine) {
      await offlineStorage.updateAssetOffline(id, updates, userId);
      await loadAssets(); // Refresh from offline storage
      return;
    }

    // Online mode - use regular update
    return updateAsset(id, updates);
  };

  // Set up real-time subscriptions for cross-device updates
  const setupRealTimeSubscriptions = useCallback(() => {
    // Clean up existing subscription
    if (realtimeSubscription.current) {
      realtimeSubscription.current.unsubscribe();
    }

    // Subscribe to assets table changes
    realtimeSubscription.current = supabase
      .channel('assets-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        (payload) => {
          console.log('Real-time asset change detected:', payload);
          // Refresh assets when any asset is changed from another device
          setTimeout(() => loadAssets(true), 500); // Small delay to ensure DB consistency
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_records' },
        (payload) => {
          console.log('Real-time inventory change detected:', payload);
          // Refresh assets when inventory status changes from another device
          setTimeout(() => loadAssets(true), 500);
        }
      )
      .subscribe();
  }, []);

  useEffect(() => {
    // Only load if we don't have cached data or not initialized
    if (!isInitialized.current) {
      loadAssets().then(() => {
        isInitialized.current = true;
        setupRealTimeSubscriptions();
      });
    } else {
      // If we have cached data, still set up real-time subscriptions
      setupRealTimeSubscriptions();
    }

    // Handle page visibility to refresh data when returning to tab after cache expires
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if cache has expired
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        if (!cacheExpiry || Date.now() >= parseInt(cacheExpiry)) {
          loadAssets(true); // Force refresh if cache expired
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up real-time subscription
      if (realtimeSubscription.current) {
        realtimeSubscription.current.unsubscribe();
      }
    };
  }, []); // Empty dependency array to run only once

  return {
    assets,
    loading,
    error,
    loadAssets,
    searchAssets,
    createAsset,
    updateAsset,
    updateAssetOffline,
    deleteAsset,
    deleteAssetSilent,
    bulkCreateAssets,
    importAssetsWithOverwrite,
    checkAssets,
    uncheckAssets,
    clearCache
  };
}
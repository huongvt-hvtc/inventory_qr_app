'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { db } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  pendingOperations: number;
  conflicts: number;
  lastSync: number;
  isSyncing: boolean;
}

export function useOfflineSync() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    pendingOperations: 0,
    conflicts: 0,
    lastSync: 0,
    isSyncing: false
  });

  const syncInProgress = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Update online status
  const updateOnlineStatus = useCallback(async () => {
    const isOnline = navigator.onLine;
    const summary = await offlineStorage.getOfflineDataSummary();

    setStatus(prev => ({
      ...prev,
      isOnline,
      isOffline: !isOnline,
      pendingOperations: summary.pendingOperations,
      conflicts: summary.conflicts,
      lastSync: summary.lastSync
    }));

    // Auto-sync when coming online
    if (isOnline && summary.pendingOperations > 0 && !syncInProgress.current) {
      // Delay sync slightly to ensure stable connection
      syncTimeoutRef.current = setTimeout(() => {
        syncOfflineData();
      }, 2000);
    }
  }, []);

  // Sync offline data when online
  const syncOfflineData = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;

    syncInProgress.current = true;
    setStatus(prev => ({ ...prev, isSyncing: true }));

    let toastId: string | null = null;

    try {
      const pendingOps = await offlineStorage.getPendingOperations();

      if (pendingOps.length === 0) {
        syncInProgress.current = false;
        setStatus(prev => ({ ...prev, isSyncing: false }));
        return;
      }

      console.log(`🔄 Syncing ${pendingOps.length} offline operations...`);

      // Show progress toast for multiple operations
      if (pendingOps.length > 1) {
        toastId = toast.loading(`Đang đồng bộ ${pendingOps.length} thao tác offline...`, { duration: Infinity });
      }

      let successCount = 0;
      let conflictCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingOps.length; i++) {
        const operation = pendingOps[i];

        try {
          const success = await syncSingleOperation(operation);

          if (success) {
            await offlineStorage.markOperationSynced(operation.id);
            successCount++;
          } else {
            conflictCount++;
          }

          // Update progress
          if (toastId) {
            const progress = Math.round(((i + 1) / pendingOps.length) * 100);
            toast.loading(`Đang đồng bộ... ${progress}% (${i + 1}/${pendingOps.length})`, { id: toastId });
          }

        } catch (error) {
          console.error('Error syncing operation:', operation, error);
          errorCount++;
        }
      }

      // Clean up synced operations
      await offlineStorage.clearSyncedOperations();

      // Update last sync timestamp
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('last_sync_timestamp', Date.now().toString());
      }

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      // Show summary
      if (successCount > 0) {
        toast.success(`✅ Đã đồng bộ ${successCount} thao tác thành công`);
      }
      if (conflictCount > 0) {
        toast.error(`⚠️ ${conflictCount} thao tác có xung đột cần xử lý`);
      }
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} thao tác đồng bộ thất bại`);
      }

    } catch (error) {
      console.error('Sync failed:', error);
      if (toastId) toast.dismiss(toastId);
      toast.error('❌ Lỗi đồng bộ dữ liệu offline');
    } finally {
      syncInProgress.current = false;
      await updateOnlineStatus(); // Refresh status
    }
  }, []);

  // Sync a single operation
  const syncSingleOperation = async (operation: any): Promise<boolean> => {
    try {
      switch (operation.type) {
        case 'scan':
          return await syncScanOperation(operation);
        case 'edit':
          return await syncEditOperation(operation);
        case 'create':
          return await syncCreateOperation(operation);
        case 'delete':
          return await syncDeleteOperation(operation);
        default:
          console.warn('Unknown operation type:', operation.type);
          return false;
      }
    } catch (error) {
      console.error('Error syncing operation:', operation, error);
      return false;
    }
  };

  // Sync scan operation
  const syncScanOperation = async (operation: any): Promise<boolean> => {
    try {
      // Check if asset still exists and get current status
      const currentAsset = await db.getAssetByCode(operation.assetCode);
      if (!currentAsset) {
        console.warn('Asset not found for scan:', operation.assetCode);
        return false;
      }

      // Check for conflicts (another device scanned between offline and sync)
      const { scanType } = operation.data;
      const currentlyChecked = currentAsset.is_checked;

      // Conflict detection logic
      if (scanType === 'check' && currentlyChecked) {
        // Someone else already checked this asset
        console.warn('Scan conflict: Asset already checked by another device');
        await offlineStorage.createConflict(operation.assetCode, 'already_checked', operation.userId);
        return false;
      }

      if (scanType === 'uncheck' && !currentlyChecked) {
        // Someone else already unchecked this asset
        console.warn('Scan conflict: Asset already unchecked by another device');
        await offlineStorage.createConflict(operation.assetCode, 'already_unchecked', operation.userId);
        return false;
      }

      // Perform the scan operation
      if (scanType === 'check') {
        await db.createInventoryRecord({
          asset_id: currentAsset.id,
          asset_code: operation.assetCode,
          checked_by: operation.userId,
          checked_at: operation.data.scannedAt || new Date().toISOString()
        });
      } else {
        await db.deleteInventoryRecord(currentAsset.id);
      }

      console.log('✅ Scan operation synced:', operation.assetCode, scanType);
      return true;

    } catch (error) {
      console.error('Error syncing scan operation:', error);
      return false;
    }
  };

  // Sync edit operation
  const syncEditOperation = async (operation: any): Promise<boolean> => {
    try {
      await db.updateAsset(operation.assetId, operation.data);
      console.log('✅ Edit operation synced:', operation.assetId);
      return true;
    } catch (error) {
      console.error('Error syncing edit operation:', error);
      return false;
    }
  };

  // Sync create operation
  const syncCreateOperation = async (operation: any): Promise<boolean> => {
    try {
      await db.createAsset(operation.data);
      console.log('✅ Create operation synced:', operation.data.asset_code);
      if (operation.assetId) {
        await offlineStorage.removeOfflineAsset(operation.assetId);
      }
      return true;
    } catch (error) {
      console.error('Error syncing create operation:', error);
      return false;
    }
  };

  // Sync delete operation
  const syncDeleteOperation = async (operation: any): Promise<boolean> => {
    try {
      await db.deleteAsset(operation.assetId);
      console.log('✅ Delete operation synced:', operation.assetId);
      if (operation.assetId) {
        await offlineStorage.removeOfflineAsset(operation.assetId);
      }
      return true;
    } catch (error) {
      console.error('Error syncing delete operation:', error);
      return false;
    }
  };

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (navigator.onLine) {
      syncOfflineData();
    } else {
      toast.error('Không có kết nối internet để đồng bộ');
    }
  }, [syncOfflineData]);

  // Initialize and set up event listeners
  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init().then(() => {
      updateOnlineStatus();
    });

    // Listen for online/offline events
    const handleOnline = () => {
      updateOnlineStatus();
      toast.success('🌐 Đã kết nối internet');
    };

    const handleOffline = () => {
      updateOnlineStatus();
      toast.error('📴 Mất kết nối internet - Chế độ offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update status periodically
    const statusInterval = setInterval(updateOnlineStatus, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(statusInterval);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [updateOnlineStatus]);

  return {
    status,
    syncOfflineData: triggerSync,
    isOffline: status.isOffline,
    isOnline: status.isOnline,
    hasPendingData: status.pendingOperations > 0,
    hasConflicts: status.conflicts > 0
  };
}

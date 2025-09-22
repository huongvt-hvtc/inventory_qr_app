'use client';

// Offline storage using IndexedDB for robust offline functionality
interface OfflineOperation {
  id: string;
  type: 'scan' | 'edit' | 'create' | 'delete';
  assetId?: string;
  assetCode?: string;
  data: any;
  timestamp: number;
  deviceId: string;
  userId: string;
  retryCount: number;
  status: 'pending' | 'synced' | 'conflict' | 'failed';
}

interface OfflineAsset {
  id: string;
  data: any;
  lastModified: number;
  isLocal: boolean;
}

class OfflineStorage {
  private dbName = 'inventory-offline-db';
  private version = 1;
  private db: IDBDatabase | null = null;
  private deviceId: string;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 'device_' + Math.random().toString(36).substring(2, 15);
    }

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for offline operations queue
        if (!db.objectStoreNames.contains('offline_operations')) {
          const operationsStore = db.createObjectStore('offline_operations', { keyPath: 'id' });
          operationsStore.createIndex('status', 'status', { unique: false });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          operationsStore.createIndex('assetCode', 'assetCode', { unique: false });
        }

        // Store for offline assets data
        if (!db.objectStoreNames.contains('offline_assets')) {
          const assetsStore = db.createObjectStore('offline_assets', { keyPath: 'id' });
          assetsStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Store for conflict resolution
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictsStore.createIndex('assetCode', 'assetCode', { unique: false });
        }
      };
    });
  }

  // Queue an operation for when online
  async queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'deviceId' | 'retryCount' | 'status'>): Promise<void> {
    if (!this.db) await this.init();

    const operationWithMetadata: OfflineOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      deviceId: this.deviceId,
      retryCount: 0,
      status: 'pending'
    };

    const transaction = this.db!.transaction(['offline_operations'], 'readwrite');
    const store = transaction.objectStore('offline_operations');
    await store.add(operationWithMetadata);

    console.log('🔄 Operation queued for offline:', operationWithMetadata);
  }

  // Get all pending operations
  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_operations'], 'readonly');
      const store = transaction.objectStore('offline_operations');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        const operations = request.result.sort((a, b) => a.timestamp - b.timestamp);
        resolve(operations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Store assets locally for offline access
  async storeAssetsOffline(assets: any[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['offline_assets'], 'readwrite');
    const store = transaction.objectStore('offline_assets');

    for (const asset of assets) {
      const offlineAsset: OfflineAsset = {
        id: asset.id,
        data: asset,
        lastModified: Date.now(),
        isLocal: false
      };
      await store.put(offlineAsset);
    }

    console.log(`💾 Stored ${assets.length} assets offline`);
  }

  // Get offline assets
  async getOfflineAssets(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_assets'], 'readonly');
      const store = transaction.objectStore('offline_assets');
      const request = store.getAll();

      request.onsuccess = () => {
        const assets = request.result.map(item => item.data);
        resolve(assets);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Update asset locally (for offline edits)
  async updateAssetOffline(assetId: string, updates: any, userId: string): Promise<void> {
    if (!this.db) await this.init();

    // Get current asset
    const transaction = this.db!.transaction(['offline_assets'], 'readwrite');
    const store = transaction.objectStore('offline_assets');
    const request = store.get(assetId);

    request.onsuccess = async () => {
      const offlineAsset = request.result;
      if (offlineAsset) {
        // Update the asset data
        const updatedAsset = {
          ...offlineAsset.data,
          ...updates,
          updated_at: new Date().toISOString()
        };

        const newOfflineAsset: OfflineAsset = {
          ...offlineAsset,
          data: updatedAsset,
          lastModified: Date.now(),
          isLocal: true // Mark as locally modified
        };

        await store.put(newOfflineAsset);

        // Queue the operation
        await this.queueOperation({
          type: 'edit',
          assetId,
          assetCode: updatedAsset.asset_code,
          data: updates,
          userId
        });

        console.log('✏️ Asset updated offline:', assetId);
      }
    };
  }

  // Scan asset offline
  async scanAssetOffline(assetCode: string, userId: string, scanType: 'check' | 'uncheck'): Promise<boolean> {
    if (!this.db) await this.init();

    // Check for existing pending scans of this asset
    const existingOps = await this.getPendingOperationsByAssetCode(assetCode);
    const hasConflict = existingOps.some(op =>
      op.type === 'scan' &&
      op.deviceId !== this.deviceId &&
      op.data.scanType !== scanType
    );

    if (hasConflict) {
      console.warn('⚠️ Scan conflict detected for asset:', assetCode);
      await this.createConflict(assetCode, scanType, userId);
      return false;
    }

    // Queue the scan operation
    await this.queueOperation({
      type: 'scan',
      assetCode,
      data: { scanType, scannedAt: new Date().toISOString() },
      userId
    });

    // Update local asset status
    await this.updateLocalAssetScanStatus(assetCode, scanType, userId);

    console.log('📱 Asset scanned offline:', assetCode, scanType);
    return true;
  }

  // Get pending operations for specific asset
  private async getPendingOperationsByAssetCode(assetCode: string): Promise<OfflineOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_operations'], 'readonly');
      const store = transaction.objectStore('offline_operations');
      const index = store.index('assetCode');
      const request = index.getAll(assetCode);

      request.onsuccess = () => {
        const operations = request.result.filter(op => op.status === 'pending');
        resolve(operations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Create conflict record
  async createConflict(assetCode: string, scanType: string, userId: string): Promise<void> {
    if (!this.db) await this.init();

    const conflict = {
      id: this.generateOperationId(),
      assetCode,
      conflictType: 'duplicate_scan',
      deviceId: this.deviceId,
      userId,
      data: { scanType },
      timestamp: Date.now(),
      resolved: false
    };

    const transaction = this.db!.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    await store.add(conflict);
  }

  // Update local asset scan status
  private async updateLocalAssetScanStatus(assetCode: string, scanType: 'check' | 'uncheck', userId: string): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['offline_assets'], 'readwrite');
    const store = transaction.objectStore('offline_assets');
    const request = store.getAll();

    request.onsuccess = async () => {
      const assets = request.result;
      const asset = assets.find(a => a.data.asset_code === assetCode);

      if (asset) {
        const updatedAssetData = {
          ...asset.data,
          is_checked: scanType === 'check',
          checked_by: scanType === 'check' ? userId : undefined,
          checked_at: scanType === 'check' ? new Date().toISOString() : undefined
        };

        const updatedOfflineAsset: OfflineAsset = {
          ...asset,
          data: updatedAssetData,
          lastModified: Date.now(),
          isLocal: true
        };

        await store.put(updatedOfflineAsset);
      }
    };
  }

  // Mark operation as synced
  async markOperationSynced(operationId: string): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['offline_operations'], 'readwrite');
    const store = transaction.objectStore('offline_operations');
    const request = store.get(operationId);

    request.onsuccess = async () => {
      const operation = request.result;
      if (operation) {
        operation.status = 'synced';
        await store.put(operation);
      }
    };
  }

  // Clear synced operations
  async clearSyncedOperations(): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['offline_operations'], 'readwrite');
    const store = transaction.objectStore('offline_operations');
    const index = store.index('status');
    const request = index.getAll('synced');

    request.onsuccess = async () => {
      const syncedOperations = request.result;
      for (const operation of syncedOperations) {
        await store.delete(operation.id);
      }
      console.log(`🧹 Cleared ${syncedOperations.length} synced operations`);
    };
  }

  // Get conflicts
  async getConflicts(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conflicts'], 'readonly');
      const store = transaction.objectStore('conflicts');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Check if we have offline data
  async hasOfflineData(): Promise<boolean> {
    if (!this.db) await this.init();

    const pendingOps = await this.getPendingOperations();
    return pendingOps.length > 0;
  }

  // Get offline data summary
  async getOfflineDataSummary(): Promise<{ pendingOperations: number; conflicts: number; lastSync: number }> {
    const pendingOps = await this.getPendingOperations();
    const conflicts = await this.getConflicts();
    const lastSync = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? parseInt(localStorage.getItem('last_sync_timestamp') || '0')
      : 0;

    return {
      pendingOperations: pendingOps.length,
      conflicts: conflicts.length,
      lastSync
    };
  }
}

export const offlineStorage = new OfflineStorage();
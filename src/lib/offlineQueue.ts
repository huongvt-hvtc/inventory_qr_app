/**
 * Offline Queue Manager
 * Handles queuing and syncing actions when app is offline
 */

export type QueuedActionType =
  | 'CREATE_ASSET'
  | 'UPDATE_ASSET'
  | 'DELETE_ASSET'
  | 'CHECK_ASSET'
  | 'UNCHECK_ASSET'
  | 'ADD_SCAN';

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

const DB_NAME = 'inventory-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

class OfflineQueueManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          console.log('📦 IndexedDB store created');
        }
      };
    });
  }

  async addAction(type: QueuedActionType, payload: any): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(action);

      request.onsuccess = () => {
        console.log('➕ Action queued:', type, action.id);
        resolve(action.id);
      };

      request.onerror = () => {
        console.error('Failed to queue action:', request.error);
        reject(request.error);
      };
    });
  }

  async getActions(): Promise<QueuedAction[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const actions = request.result || [];
        resolve(actions.sort((a, b) => a.timestamp - b.timestamp));
      };

      request.onerror = () => {
        console.error('Failed to get actions:', request.error);
        reject(request.error);
      };
    });
  }

  async getPendingActions(): Promise<QueuedAction[]> {
    const actions = await this.getActions();
    return actions.filter(a => a.status === 'pending');
  }

  async updateAction(id: string, updates: Partial<QueuedAction>): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (!action) {
          reject(new Error('Action not found'));
          return;
        }

        const updatedAction = { ...action, ...updates };
        const putRequest = store.put(updatedAction);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async removeAction(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('🗑️ Action removed:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to remove action:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🧹 All actions cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear actions:', request.error);
        reject(request.error);
      };
    });
  }

  async getQueueSize(): Promise<number> {
    const actions = await getPendingActions();
    return actions.length;
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();

// Helper functions
export async function queueAction(type: QueuedActionType, payload: any): Promise<string> {
  return offlineQueue.addAction(type, payload);
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  return offlineQueue.getPendingActions();
}

export async function removeAction(id: string): Promise<void> {
  return offlineQueue.removeAction(id);
}

export async function updateAction(id: string, updates: Partial<QueuedAction>): Promise<void> {
  return offlineQueue.updateAction(id, updates);
}

export async function clearQueue(): Promise<void> {
  return offlineQueue.clearAll();
}

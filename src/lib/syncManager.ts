/**
 * Sync Manager
 * Processes queued actions and syncs them to the server
 */

import { supabase } from './supabase';
import { offlineQueue, QueuedAction, QueuedActionType } from './offlineQueue';
import { addScanToHistory } from './scanHistory';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

type SyncCallback = (status: 'syncing' | 'success' | 'error', queueSize: number) => void;

class SyncManager {
  private isSyncing = false;
  private callbacks: Set<SyncCallback> = new Set();

  onSyncStatusChange(callback: SyncCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(status: 'syncing' | 'success' | 'error', queueSize: number) {
    this.callbacks.forEach(cb => cb(status, queueSize));
  }

  async syncAll(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('⏸️ Sync already in progress');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    const actions = await offlineQueue.getPendingActions();

    if (actions.length === 0) {
      this.isSyncing = false;
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 Syncing ${actions.length} actions...`);
    this.notifyCallbacks('syncing', actions.length);

    let successCount = 0;
    let failedCount = 0;

    for (const action of actions) {
      try {
        await this.syncAction(action);
        await offlineQueue.removeAction(action.id);
        successCount++;
        console.log(`✅ Synced action ${action.id}`);
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to sync action ${action.id}:`, error);

        const newRetryCount = action.retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          await offlineQueue.updateAction(action.id, {
            status: 'failed',
            retryCount: newRetryCount,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } else {
          await offlineQueue.updateAction(action.id, {
            retryCount: newRetryCount
          });
        }
      }
    }

    this.isSyncing = false;
    const remainingActions = await offlineQueue.getPendingActions();
    const status = failedCount > 0 ? 'error' : 'success';
    this.notifyCallbacks(status, remainingActions.length);

    console.log(`🏁 Sync complete: ${successCount} success, ${failedCount} failed`);
    return { success: successCount, failed: failedCount };
  }

  private async syncAction(action: QueuedAction): Promise<void> {
    await offlineQueue.updateAction(action.id, { status: 'syncing' });

    switch (action.type) {
      case 'CREATE_ASSET':
        await this.syncCreateAsset(action.payload);
        break;

      case 'UPDATE_ASSET':
        await this.syncUpdateAsset(action.payload);
        break;

      case 'DELETE_ASSET':
        await this.syncDeleteAsset(action.payload);
        break;

      case 'CHECK_ASSET':
        await this.syncCheckAsset(action.payload);
        break;

      case 'UNCHECK_ASSET':
        await this.syncUncheckAsset(action.payload);
        break;

      case 'ADD_SCAN':
        await this.syncAddScan(action.payload);
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  private async syncCreateAsset(payload: any): Promise<void> {
    const { userEmail, asset } = payload;

    const { error } = await supabase
      .from('assets')
      .insert([{
        ...asset,
        created_by: userEmail,
        updated_by: userEmail
      }]);

    if (error) throw error;
  }

  private async syncUpdateAsset(payload: any): Promise<void> {
    const { assetId, updates, userEmail } = payload;

    const { error } = await supabase
      .from('assets')
      .update({
        ...updates,
        updated_by: userEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (error) throw error;
  }

  private async syncDeleteAsset(payload: any): Promise<void> {
    const { assetId } = payload;

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId);

    if (error) throw error;
  }

  private async syncCheckAsset(payload: any): Promise<void> {
    const { assetId, userEmail, notes } = payload;

    const { error } = await supabase.rpc('check_asset', {
      asset_id_param: assetId,
      user_email_param: userEmail,
      notes_param: notes || null
    });

    if (error) throw error;
  }

  private async syncUncheckAsset(payload: any): Promise<void> {
    const { assetId } = payload;

    const { error } = await supabase.rpc('uncheck_asset', {
      asset_id_param: assetId
    });

    if (error) throw error;
  }

  private async syncAddScan(payload: any): Promise<void> {
    const { userEmail, assetId } = payload;
    await addScanToHistory(userEmail, assetId);
  }

  async retrySingleAction(actionId: string): Promise<void> {
    const actions = await offlineQueue.getActions();
    const action = actions.find(a => a.id === actionId);

    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status === 'syncing') {
      throw new Error('Action is already syncing');
    }

    try {
      await this.syncAction(action);
      await offlineQueue.removeAction(action.id);
      console.log(`✅ Retried and synced action ${action.id}`);

      const remainingActions = await offlineQueue.getPendingActions();
      this.notifyCallbacks('success', remainingActions.length);
    } catch (error) {
      console.error(`❌ Failed to retry action ${action.id}:`, error);

      const newRetryCount = action.retryCount + 1;

      await offlineQueue.updateAction(action.id, {
        status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
        retryCount: newRetryCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const remainingActions = await offlineQueue.getPendingActions();
      this.notifyCallbacks('error', remainingActions.length);

      throw error;
    }
  }

  async clearFailedActions(): Promise<void> {
    const actions = await offlineQueue.getActions();
    const failedActions = actions.filter(a => a.status === 'failed');

    for (const action of failedActions) {
      await offlineQueue.removeAction(action.id);
    }

    console.log(`🧹 Cleared ${failedActions.length} failed actions`);
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// Helper functions
export async function syncAllActions() {
  return syncManager.syncAll();
}

export async function retrySingleAction(actionId: string) {
  return syncManager.retrySingleAction(actionId);
}

export async function clearFailedActions() {
  return syncManager.clearFailedActions();
}

export function onSyncStatusChange(callback: SyncCallback) {
  return syncManager.onSyncStatusChange(callback);
}

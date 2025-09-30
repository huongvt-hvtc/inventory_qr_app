import { supabase } from './supabase';
import { AssetWithInventoryStatus } from '@/types';

export interface ScanHistoryRecord {
  id: string;
  user_email: string;
  asset_id: string;
  asset_code: string;
  scanned_at: string;
  created_at: string;
}

/**
 * Get recent scans for current user with full asset details
 */
export async function getRecentScans(
  userEmail: string,
  limit: number = 50
): Promise<AssetWithInventoryStatus[]> {
  try {
    const { data, error } = await supabase.rpc('get_recent_scans', {
      user_email_param: userEmail,
      limit_count: limit
    });

    if (error) {
      console.error('Error fetching recent scans:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get recent scans:', error);
    return [];
  }
}

/**
 * Add a scan to user's history
 */
export async function addScanToHistory(
  userEmail: string,
  assetId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('add_scan_to_history', {
      user_email_param: userEmail,
      asset_id_param: assetId
    });

    if (error) {
      console.error('Error adding scan to history:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to add scan to history:', error);
    return null;
  }
}

/**
 * Clear all scan history for current user
 */
export async function clearScanHistory(userEmail: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('user_email', userEmail);

    if (error) {
      console.error('Error clearing scan history:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to clear scan history:', error);
    return false;
  }
}

/**
 * Remove a specific scan from history
 */
export async function removeScanFromHistory(
  scanId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scan_history')
      .delete()
      .eq('id', scanId);

    if (error) {
      console.error('Error removing scan from history:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to remove scan from history:', error);
    return false;
  }
}
// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import type {
  User,
  Asset,
  InventoryRecord,
  AssetWithInventoryStatus,
  ActivityLog,
  DashboardStats
} from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CurrentUserIdentity {
  id: string | null;
  email: string | null;
}

const resolveCurrentUserIdentity = async (): Promise<CurrentUserIdentity> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;
    if (!error && sessionUser?.email) {
      return {
        id: sessionUser.id ?? null,
        email: sessionUser.email
      };
    }

    if (error) {
      console.warn('Failed to resolve current session via getSession:', error);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Failed to resolve current user via getUser:', userError);
      return {
        id: sessionUser?.id ?? null,
        email: null
      };
    }

    return {
      id: userData.user?.id ?? sessionUser?.id ?? null,
      email: userData.user?.email ?? null
    };
  } catch (sessionError) {
    console.error('Unexpected error resolving session:', sessionError);
    return {
      id: null,
      email: null
    };
  }
};

// Database service functions
export const db = {
  // User management
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  },

  async upsertUser(userData: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .upsert(userData)
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      return null;
    }

    return data;
  },

  // Asset management
  async getAssets(): Promise<AssetWithInventoryStatus[]> {
    try {
      const isStandalone = typeof window !== 'undefined' && ((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches);
      console.log('🔍 PWA Debug - Supabase getAssets called:', {
        isStandalone,
        supabaseUrl: supabaseUrl.substring(0, 30) + '...',
        hasAnonKey: !!supabaseAnonKey
      });

      // Skip the custom function for now and use the reliable fallback query
      // TODO: Fix the custom function's ambiguous column reference issue
      console.log('Using fallback query for assets with inventory status');

      // Fallback: Use basic queries
      console.log('🔍 PWA Debug - Making assets request...', { isStandalone });
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('🔍 PWA Debug - Assets request result:', {
        hasData: !!assets,
        dataLength: assets?.length,
        hasError: !!assetsError,
        error: assetsError,
        isStandalone
      });

      if (assetsError) {
        console.error('🔍 PWA Debug - Error fetching assets:', {
          error: assetsError,
          isStandalone
        });
        throw assetsError;
      }

      // Get inventory records separately
      const { data: records, error: recordsError } = await supabase
        .from('inventory_records')
        .select('*');

      if (recordsError) {
        console.error('Error fetching inventory records:', recordsError);
        // Continue without inventory records
      }

      // Combine assets with inventory status
      const assetsWithStatus: AssetWithInventoryStatus[] = (assets || []).map(asset => {
        const latestRecord = records?.find(r => r.asset_id === asset.id);
        return {
          ...asset,
          is_checked: !!latestRecord,
          checked_by: latestRecord?.checked_by,
          checked_at: latestRecord?.checked_at,
          inventory_notes: latestRecord?.notes
        };
      });

      return assetsWithStatus;
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      throw error;
    }
  },

  async getAssetById(id: string): Promise<AssetWithInventoryStatus | null> {
    try {
      const { data: asset, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching asset:', error);
        return null;
      }

      // Get latest inventory record
      const { data: record } = await supabase
        .from('inventory_records')
        .select('*')
        .eq('asset_id', id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...asset,
        is_checked: !!record,
        checked_by: record?.checked_by,
        checked_at: record?.checked_at,
        inventory_notes: record?.notes
      };
    } catch (error) {
      console.error('Error fetching asset by ID:', error);
      return null;
    }
  },

  async getAssetByCode(assetCode: string): Promise<AssetWithInventoryStatus | null> {
    try {
      const { data: asset, error } = await supabase
        .from('assets')
        .select('*')
        .eq('asset_code', assetCode)
        .single();

      if (error) {
        console.error('Error fetching asset by code:', error);
        return null;
      }

      // Get latest inventory record
      const { data: record } = await supabase
        .from('inventory_records')
        .select('*')
        .eq('asset_id', asset.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...asset,
        is_checked: !!record,
        checked_by: record?.checked_by,
        checked_at: record?.checked_at,
        inventory_notes: record?.notes
      };
    } catch (error) {
      console.error('Error fetching asset by code:', error);
      return null;
    }
  },

  async createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'qr_generated'>): Promise<Asset> {
    const identity = await resolveCurrentUserIdentity();
    const createdBy = asset.created_by?.trim() || identity.email || identity.id;

    if (!createdBy) {
      throw new Error('Không xác định được người tạo tài sản. Vui lòng đăng nhập lại.');
    }

    const payload = {
      ...asset,
      created_by: createdBy,
      qr_generated: false
    };

    const { data, error } = await supabase
      .from('assets')
      .insert(payload)
      .select()
      .single();

    if (error) {
      const needsFallback =
        identity.id &&
        identity.email &&
        createdBy === identity.email &&
        (error.code === '22P02' || error.code === '23503' || (typeof error.message === 'string' && error.message.toLowerCase().includes('uuid')));

      if (needsFallback) {
        console.warn('Retrying asset creation with user id due to created_by constraint:', error.message);
        const fallbackPayload = {
          ...asset,
          created_by: identity.id,
          qr_generated: false
        };

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('assets')
          .insert(fallbackPayload)
          .select()
          .single();

        if (fallbackError) {
          console.error('Fallback asset creation failed:', fallbackError);
          throw fallbackError;
        }

        return fallbackData;
      }

      console.error('Error creating asset:', error);
      throw error;
    }

    return data;
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating asset:', error);
      throw error;
    }

    return data;
  },

  async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  },

  async bulkCreateAssets(assets: Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'qr_generated'>[]): Promise<Asset[]> {
    const identity = await resolveCurrentUserIdentity();

    const assetsWithDefaults = assets.map(asset => {
      const createdBy = asset.created_by?.trim() || identity.email || identity.id;

      if (!createdBy) {
        throw new Error('Thiếu thông tin người tạo khi import tài sản.');
      }

      return {
        ...asset,
        created_by: createdBy,
        qr_generated: false
      };
    });

    const usedEmailForCreatedBy = identity.email
      ? assetsWithDefaults.some(asset => asset.created_by === identity.email)
      : false;

    const { data, error } = await supabase
      .from('assets')
      .insert(assetsWithDefaults)
      .select();

    if (error) {
      const shouldRetryWithId = (
        identity.id &&
        usedEmailForCreatedBy &&
        (error.code === '22P02' || error.code === '23503' || (typeof error.message === 'string' && error.message.toLowerCase().includes('uuid')))
      );

      if (shouldRetryWithId) {
        console.warn('Retrying bulk asset creation with user id due to created_by constraint:', error.message);
        const fallbackAssets = assets.map(asset => {
          const createdById = asset.created_by?.trim() || identity.id;

          if (!createdById) {
            throw new Error('Thiếu thông tin người tạo khi import tài sản.');
          }

          return {
            ...asset,
            created_by: createdById,
            qr_generated: false
          };
        });

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('assets')
          .insert(fallbackAssets)
          .select();

        if (fallbackError) {
          console.error('Fallback bulk asset creation failed:', fallbackError);
          throw fallbackError;
        }

        return fallbackData;
      }

      console.error('Error bulk creating assets:', error);
      throw error;
    }

    return data;
  },

  async updateAssetQRGenerated(assetIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .update({ qr_generated: true })
      .in('id', assetIds);

    if (error) {
      console.error('Error updating QR generated status:', error);
      throw error;
    }
  },

  // Inventory records management
  async getInventoryRecords(): Promise<InventoryRecord[]> {
    const { data, error } = await supabase
      .from('inventory_records')
      .select('*')
      .order('checked_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventory records:', error);
      throw error;
    }

    return data || [];
  },

  async createInventoryRecord(record: Omit<InventoryRecord, 'id' | 'created_at'>): Promise<InventoryRecord> {
    const { data, error } = await supabase
      .from('inventory_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating inventory record:', error);
      throw error;
    }

    return data;
  },

  async deleteInventoryRecord(assetId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_records')
      .delete()
      .eq('asset_id', assetId);

    if (error) {
      console.error('Error deleting inventory record:', error);
      throw error;
    }
  },

  // Dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    // Get total assets count
    const { count: totalAssets, error: assetsError } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true });

    if (assetsError) {
      console.error('Error fetching assets count:', assetsError);
      throw assetsError;
    }

    // Get checked assets count
    const { count: checkedAssets, error: checkedError } = await supabase
      .from('inventory_records')
      .select('asset_id', { count: 'exact', head: true });

    if (checkedError) {
      console.error('Error fetching checked assets count:', checkedError);
      throw checkedError;
    }

    // Get recent scans
    const { data: recentScans, error: scansError } = await supabase
      .from('inventory_records')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(10);

    if (scansError) {
      console.error('Error fetching recent scans:', scansError);
      throw scansError;
    }

    const total = totalAssets || 0;
    const checked = checkedAssets || 0;
    const unchecked = total - checked;
    const completionRate = total > 0 ? Math.round((checked / total) * 100) : 0;

    return {
      total_assets: total,
      checked_assets: checked,
      unchecked_assets: unchecked,
      completion_rate: completionRate,
      recent_scans: recentScans || []
    };
  },

  // Activity logging
  async logActivity(activity: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('activity_logs')
      .insert(activity);

    if (error) {
      console.error('Error logging activity:', error);
    }
  },

  // Search and filtering
  async searchAssets(query: string, filters: {
    department?: string;
    status?: string;
    location?: string;
    inventory_status?: 'all' | 'checked' | 'unchecked';
  } = {}): Promise<AssetWithInventoryStatus[]> {
    try {
      // Start with basic asset query
      let queryBuilder = supabase
        .from('assets')
        .select('*');

      // Apply search filter
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`asset_code.ilike.%${query}%,name.ilike.%${query}%,model.ilike.%${query}%,serial.ilike.%${query}%,tech_code.ilike.%${query}%`);
      }

      // Apply department filter
      if (filters.department && filters.department !== 'all') {
        queryBuilder = queryBuilder.eq('department', filters.department);
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        queryBuilder = queryBuilder.eq('status', filters.status);
      }

      // Apply location filter
      if (filters.location && filters.location !== 'all') {
        queryBuilder = queryBuilder.eq('location', filters.location);
      }

      const { data: assets, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching assets:', error);
        throw error;
      }

      if (!assets) return [];

      // Get inventory records for these assets
      const assetIds = assets.map(a => a.id);
      const { data: records } = await supabase
        .from('inventory_records')
        .select('*')
        .in('asset_id', assetIds);

      // Combine with inventory status
      let assetsWithStatus: AssetWithInventoryStatus[] = assets.map(asset => {
        const latestRecord = records?.find(r => r.asset_id === asset.id);
        return {
          ...asset,
          is_checked: !!latestRecord,
          checked_by: latestRecord?.checked_by,
          checked_at: latestRecord?.checked_at,
          inventory_notes: latestRecord?.notes
        };
      });

      // Apply inventory status filter
      if (filters.inventory_status === 'checked') {
        assetsWithStatus = assetsWithStatus.filter(a => a.is_checked);
      } else if (filters.inventory_status === 'unchecked') {
        assetsWithStatus = assetsWithStatus.filter(a => !a.is_checked);
      }

      return assetsWithStatus;
    } catch (error) {
      console.error('Error searching assets:', error);
      throw error;
    }
  },

  // Get unique filter values
  async getFilterOptions(): Promise<{
    departments: string[];
    statuses: string[];
    locations: string[];
  }> {
    const { data, error } = await supabase
      .from('assets')
      .select('department, status, location');

    if (error) {
      console.error('Error fetching filter options:', error);
      throw error;
    }

    const departments = [...new Set(data?.map(item => item.department).filter(Boolean))];
    const statuses = [...new Set(data?.map(item => item.status).filter(Boolean))];
    const locations = [...new Set(data?.map(item => item.location).filter(Boolean))];

    return {
      departments: departments.sort(),
      statuses: statuses.sort(),
      locations: locations.sort()
    };
  }
};
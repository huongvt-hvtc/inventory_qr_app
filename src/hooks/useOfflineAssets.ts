/**
 * useOfflineAssets Hook
 * Handles asset operations with offline queue support
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { queueAction } from '@/lib/offlineQueue'
import { useAuth } from '@/contexts/AuthContext'
import { useNetwork } from '@/contexts/NetworkContext'
import { Asset, AssetWithInventoryStatus } from '@/types'
import toast from 'react-hot-toast'

export function useOfflineAssets() {
  const { user } = useAuth()
  const { isOnline, refreshPendingCount } = useNetwork()

  const createAsset = useCallback(async (asset: Partial<Asset>): Promise<string | null> => {
    if (!user?.email) {
      toast.error('Vui lòng đăng nhập')
      return null
    }

    if (!isOnline) {
      // Queue for later sync
      const actionId = await queueAction('CREATE_ASSET', {
        userEmail: user.email,
        asset
      })
      await refreshPendingCount()
      toast.success('Tài sản sẽ được tạo khi có internet', { duration: 4000 })

      // Return a temporary ID
      return `temp_${Date.now()}`
    }

    // Online: Execute immediately
    const { data, error } = await supabase
      .from('assets')
      .insert([{
        ...asset,
        created_by: user.email,
        updated_by: user.email
      }])
      .select()
      .single()

    if (error) {
      console.error('Failed to create asset:', error)
      toast.error('Lỗi khi tạo tài sản')
      return null
    }

    return data.id
  }, [user, isOnline, refreshPendingCount])

  const updateAsset = useCallback(async (
    assetId: string,
    updates: Partial<Asset>
  ): Promise<boolean> => {
    if (!user?.email) {
      toast.error('Vui lòng đăng nhập')
      return false
    }

    if (!isOnline) {
      // Queue for later sync
      await queueAction('UPDATE_ASSET', {
        assetId,
        updates,
        userEmail: user.email
      })
      await refreshPendingCount()
      toast.success('Cập nhật sẽ đồng bộ khi có internet', { duration: 4000 })
      return true
    }

    // Online: Execute immediately
    const { error } = await supabase
      .from('assets')
      .update({
        ...updates,
        updated_by: user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)

    if (error) {
      console.error('Failed to update asset:', error)
      toast.error('Lỗi khi cập nhật tài sản')
      return false
    }

    return true
  }, [user, isOnline, refreshPendingCount])

  const deleteAsset = useCallback(async (assetId: string): Promise<boolean> => {
    if (!user?.email) {
      toast.error('Vui lòng đăng nhập')
      return false
    }

    if (!isOnline) {
      // Queue for later sync
      await queueAction('DELETE_ASSET', {
        assetId
      })
      await refreshPendingCount()
      toast.success('Xóa sẽ đồng bộ khi có internet', { duration: 4000 })
      return true
    }

    // Online: Execute immediately
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)

    if (error) {
      console.error('Failed to delete asset:', error)
      toast.error('Lỗi khi xóa tài sản')
      return false
    }

    return true
  }, [user, isOnline, refreshPendingCount])

  const checkAsset = useCallback(async (
    assetId: string,
    notes?: string
  ): Promise<boolean> => {
    if (!user?.email) {
      toast.error('Vui lòng đăng nhập')
      return false
    }

    if (!isOnline) {
      // Queue for later sync
      await queueAction('CHECK_ASSET', {
        assetId,
        userEmail: user.email,
        notes
      })
      await refreshPendingCount()
      toast.success('Check sẽ đồng bộ khi có internet', { duration: 4000 })
      return true
    }

    // Online: Execute immediately
    const { error } = await supabase.rpc('check_asset', {
      asset_id_param: assetId,
      user_email_param: user.email,
      notes_param: notes || null
    })

    if (error) {
      console.error('Failed to check asset:', error)
      toast.error('Lỗi khi check tài sản')
      return false
    }

    return true
  }, [user, isOnline, refreshPendingCount])

  const uncheckAsset = useCallback(async (assetId: string): Promise<boolean> => {
    if (!user?.email) {
      toast.error('Vui lòng đăng nhập')
      return false
    }

    if (!isOnline) {
      // Queue for later sync
      await queueAction('UNCHECK_ASSET', {
        assetId
      })
      await refreshPendingCount()
      toast.success('Uncheck sẽ đồng bộ khi có internet', { duration: 4000 })
      return true
    }

    // Online: Execute immediately
    const { error } = await supabase.rpc('uncheck_asset', {
      asset_id_param: assetId
    })

    if (error) {
      console.error('Failed to uncheck asset:', error)
      toast.error('Lỗi khi uncheck tài sản')
      return false
    }

    return true
  }, [user, isOnline, refreshPendingCount])

  return {
    createAsset,
    updateAsset,
    deleteAsset,
    checkAsset,
    uncheckAsset
  }
}

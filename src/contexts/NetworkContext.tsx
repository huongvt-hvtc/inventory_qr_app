'use client'

/**
 * Network Context
 * Tracks online/offline status and triggers sync when coming back online
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { syncAllActions, onSyncStatusChange } from '@/lib/syncManager'
import { getPendingActions } from '@/lib/offlineQueue'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import toast from 'react-hot-toast'

interface NetworkContextType {
  isOnline: boolean
  isSyncing: boolean
  pendingActionsCount: number
  syncNow: () => Promise<void>
  refreshPendingCount: () => Promise<void>
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export const useNetwork = () => {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return context
}

interface NetworkProviderProps {
  children: React.ReactNode
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [pendingActionsCount, setPendingActionsCount] = useState(0)

  const { status: offlineStatus, syncOfflineData } = useOfflineSync()

  const refreshPendingCount = useCallback(async () => {
    try {
      const actions = await getPendingActions()
      setQueueCount(actions.length)
    } catch (error) {
      console.error('Failed to get pending actions count:', error)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error('Không có kết nối internet')
      return
    }

    if (isSyncing) {
      return
    }

    try {
      setIsSyncing(true)
      const toastId = toast.loading('Đang đồng bộ dữ liệu...')

      const result = await syncAllActions()

      // Trigger offline storage sync alongside queue sync
      await syncOfflineData()

      if (result.failed > 0) {
        toast.error(`Đồng bộ thất bại ${result.failed} thao tác`, { id: toastId })
      } else if (result.success > 0) {
        toast.success(`Đã đồng bộ ${result.success} thao tác`, { id: toastId })
      } else {
        toast.success('Không có thao tác cần đồng bộ', { id: toastId })
      }

      await refreshPendingCount()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Lỗi khi đồng bộ dữ liệu')
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, refreshPendingCount])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Network: ONLINE')
      setIsOnline(true)

      // Auto-sync when coming back online
      const actions = await getPendingActions()
      if (actions.length > 0) {
        console.log(`📤 Auto-syncing ${actions.length} pending actions...`)
        setTimeout(async () => {
          try {
            setIsSyncing(true)
            const toastId = toast.loading('Đang đồng bộ dữ liệu...')

            const result = await syncAllActions()

            await syncOfflineData()

            if (result.failed > 0) {
              toast.error(`Đồng bộ thất bại ${result.failed} thao tác`, { id: toastId })
            } else if (result.success > 0) {
              toast.success(`Đã đồng bộ ${result.success} thao tác`, { id: toastId })
            } else {
              toast.success('Không có thao tác cần đồng bộ', { id: toastId })
            }

            // Refresh count after sync
            const updatedActions = await getPendingActions()
            setQueueCount(updatedActions.length)
          } catch (error) {
            console.error('Sync error:', error)
            toast.error('Lỗi khi đồng bộ dữ liệu')
          } finally {
            setIsSyncing(false)
          }
        }, 1000) // Wait 1 second to ensure connection is stable
      }
    }

    const handleOffline = () => {
      console.log('📵 Network: OFFLINE')
      setIsOnline(false)
      toast.error('Mất kết nối internet. Thao tác sẽ được lưu và đồng bộ khi online.', {
        duration: 5000
      })
    }

    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Listen to sync status changes
  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status, queueSize) => {
      console.log(`📊 Sync status: ${status}, Queue size: ${queueSize}`)
      setQueueCount(queueSize)

      if (status === 'syncing') {
        setIsSyncing(true)
      } else {
        setIsSyncing(false)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Initial pending count load
  useEffect(() => {
    const loadInitialCount = async () => {
      try {
        const actions = await getPendingActions()
        setQueueCount(actions.length)
      } catch (error) {
        console.error('Failed to load initial pending count:', error)
      }
    }
    loadInitialCount()
  }, [])

  useEffect(() => {
    setPendingActionsCount(queueCount + offlineStatus.pendingOperations)
  }, [queueCount, offlineStatus.pendingOperations])

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingActionsCount,
        syncNow,
        refreshPendingCount
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

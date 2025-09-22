'use client';

import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, RotateCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineStatusIndicator() {
  const { status, syncOfflineData, hasPendingData, hasConflicts } = useOfflineSync();

  if (status.isOnline && !hasPendingData && !hasConflicts) {
    return null; // Don't show indicator when everything is normal
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm border
        ${status.isOffline
          ? 'bg-orange-100/90 border-orange-300 text-orange-800'
          : 'bg-blue-100/90 border-blue-300 text-blue-800'
        }
      `}>
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {status.isOffline ? (
            <WifiOff className="h-4 w-4 text-orange-600" />
          ) : (
            <Wifi className="h-4 w-4 text-green-600" />
          )}

          <span className="text-sm font-medium">
            {status.isOffline ? 'Offline' : 'Online'}
          </span>
        </div>

        {/* Pending Operations */}
        {hasPendingData && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
            <RotateCw className={`h-4 w-4 ${status.isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-sm">
              {status.pendingOperations} pending
            </span>

            {status.isOnline && !status.isSyncing && (
              <Button
                size="sm"
                variant="outline"
                onClick={syncOfflineData}
                className="h-6 px-2 text-xs bg-white/80 hover:bg-white"
              >
                RotateCw
              </Button>
            )}
          </div>
        )}

        {/* Conflicts */}
        {hasConflicts && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              {status.conflicts} conflicts
            </span>
          </div>
        )}

        {/* RotateCw Status */}
        {status.isSyncing && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
            <div className="animate-pulse text-sm font-medium">
              RotateCwing...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
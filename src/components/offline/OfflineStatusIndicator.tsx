'use client';

import React from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { Wifi, WifiOff, RotateCw } from 'lucide-react';

export function OfflineStatusIndicator() {
  const { isOnline, isSyncing, pendingActionsCount, syncNow } = useNetwork();

  // Show indicator when offline OR when there are pending actions
  if (isOnline && pendingActionsCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm border
        ${!isOnline
          ? 'bg-red-100/90 border-red-300 text-red-800'
          : 'bg-blue-100/90 border-blue-300 text-blue-800'
        }
      `}>
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="h-4 w-4 text-red-600" />
          ) : (
            <Wifi className="h-4 w-4 text-green-600" />
          )}

          <span className="text-sm font-medium">
            {!isOnline ? 'Offline' : 'Online'}
          </span>
        </div>

        {/* Pending Actions */}
        {pendingActionsCount > 0 && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
            <RotateCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-sm">
              {pendingActionsCount} chờ sync
            </span>

            {isOnline && !isSyncing && (
              <button
                onClick={syncNow}
                className="h-6 px-2 text-xs bg-white/80 hover:bg-white rounded border border-gray-300 font-medium"
              >
                Đồng bộ
              </button>
            )}
          </div>
        )}

        {/* Syncing Status */}
        {isSyncing && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
            <div className="animate-pulse text-sm font-medium">
              Đang sync...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
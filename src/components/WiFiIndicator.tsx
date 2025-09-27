'use client';

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function WiFiIndicator() {
  const { isOnline } = useNetworkStatus();

  return (
    <div className={`flex items-center transition-all duration-300 ${
      isOnline ? 'text-green-600' : 'text-red-500'
    }`}>
      {isOnline ? (
        <Wifi className="h-5 w-5" />
      ) : (
        <WifiOff className="h-5 w-5 animate-pulse" />
      )}
    </div>
  );
}
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AssetWithInventoryStatus } from '@/types';

interface RecentScansContextType {
  recentScans: AssetWithInventoryStatus[];
  addToRecentScans: (asset: AssetWithInventoryStatus) => void;
  updateRecentScan: (assetId: string, updates: Partial<AssetWithInventoryStatus>) => void;
  clearRecentScans: () => void;
}

const RecentScansContext = createContext<RecentScansContextType | undefined>(undefined);

export const useRecentScans = () => {
  const context = useContext(RecentScansContext);
  if (context === undefined) {
    throw new Error('useRecentScans must be used within a RecentScansProvider');
  }
  return context;
};

interface RecentScansProviderProps {
  children: ReactNode;
}

export const RecentScansProvider: React.FC<RecentScansProviderProps> = ({ children }) => {
  const [recentScans, setRecentScans] = useState<AssetWithInventoryStatus[]>([]);

  const addToRecentScans = (asset: AssetWithInventoryStatus) => {
    setRecentScans(prev => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.filter(scan => scan.id !== asset.id);
      // Add to front and keep only last 20 scans
      return [asset, ...filtered].slice(0, 20);
    });
  };

  const updateRecentScan = (assetId: string, updates: Partial<AssetWithInventoryStatus>) => {
    setRecentScans(prev =>
      prev.map(scan =>
        scan.id === assetId
          ? { ...scan, ...updates }
          : scan
      )
    );
  };

  const clearRecentScans = () => {
    setRecentScans([]);
  };

  const value = {
    recentScans,
    addToRecentScans,
    updateRecentScan,
    clearRecentScans
  };

  return (
    <RecentScansContext.Provider value={value}>
      {children}
    </RecentScansContext.Provider>
  );
};
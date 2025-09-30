'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { AssetWithInventoryStatus } from '@/types';
import { useAuth } from './AuthContext';
import { getRecentScans, addScanToHistory, clearScanHistory } from '@/lib/scanHistory';
import toast from 'react-hot-toast';

interface RecentScansContextType {
  recentScans: AssetWithInventoryStatus[];
  loading: boolean;
  addToRecentScans: (asset: AssetWithInventoryStatus) => Promise<void>;
  updateRecentScan: (assetId: string, updates: Partial<AssetWithInventoryStatus>) => void;
  clearRecentScans: () => Promise<void>;
  refreshScans: () => Promise<void>;
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
  const { user } = useAuth();
  const [recentScans, setRecentScans] = useState<AssetWithInventoryStatus[]>([]);
  const [loading, setLoading] = useState(false);

  // Load scans from database when user changes
  const loadScans = useCallback(async () => {
    if (!user?.email) {
      setRecentScans([]);
      return;
    }

    setLoading(true);
    try {
      const scans = await getRecentScans(user.email, 50);
      setRecentScans(scans);
    } catch (error) {
      console.error('Error loading recent scans:', error);
      toast.error('Không thể tải lịch sử kiểm kê');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Load scans on mount and when user changes
  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const addToRecentScans = async (asset: AssetWithInventoryStatus) => {
    if (!user?.email) {
      console.warn('Cannot add scan: user not authenticated');
      return;
    }

    try {
      // Add to database
      await addScanToHistory(user.email, asset.id);

      // Update local state immediately for better UX
      setRecentScans(prev => {
        // Remove if already exists to avoid duplicates
        const filtered = prev.filter(scan => scan.id !== asset.id);
        // Add to front and keep only last 50 scans
        return [asset, ...filtered].slice(0, 50);
      });
    } catch (error) {
      console.error('Error adding scan to history:', error);
      // Don't show error toast as this is background operation
    }
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

  const clearRecentScans = async () => {
    if (!user?.email) {
      console.warn('Cannot clear scans: user not authenticated');
      return;
    }

    try {
      await clearScanHistory(user.email);
      setRecentScans([]);
      toast.success('Đã xóa lịch sử kiểm kê');
    } catch (error) {
      console.error('Error clearing scan history:', error);
      toast.error('Không thể xóa lịch sử kiểm kê');
    }
  };

  const refreshScans = async () => {
    await loadScans();
  };

  const value = {
    recentScans,
    loading,
    addToRecentScans,
    updateRecentScan,
    clearRecentScans,
    refreshScans
  };

  return (
    <RecentScansContext.Provider value={value}>
      {children}
    </RecentScansContext.Provider>
  );
};
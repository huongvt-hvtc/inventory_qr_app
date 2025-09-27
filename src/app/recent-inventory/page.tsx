'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  History,
  Search,
  Filter,
  FilterX,
  Eye,
  Check,
  X,
  Clock,
  User,
  Package,
  Building,
  MapPin,
  Tag,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useRecentScans } from '@/contexts/RecentScansContext';
import { useAssets } from '@/hooks/useAssets';
import { useRefresh } from '@/contexts/RefreshContext';
import AssetDetailModal from '@/components/assets/AssetDetailModal';
import { AssetWithInventoryStatus } from '@/types';
import { WiFiIndicator } from '@/components/WiFiIndicator';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function RecentInventoryPage() {
  const { user } = useAuth();
  const { setRefreshFunction } = useRefresh();
  const { recentScans, clearRecentScans } = useRecentScans();
  const { checkAssets, uncheckAssets, loadAssets, loading } = useAssets();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked' | 'unchecked'>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedScans, setSelectedScans] = useState<Set<string>>(new Set());

  const [assetDetailModal, setAssetDetailModal] = useState<{
    isOpen: boolean;
    asset: AssetWithInventoryStatus | null;
    mode: 'view' | 'edit'
  }>({
    isOpen: false,
    asset: null,
    mode: 'view'
  });

  // Filter and search logic
  const filteredScans = useMemo(() => {
    return recentScans.filter(scan => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!scan.asset_code.toLowerCase().includes(term) &&
            !scan.name.toLowerCase().includes(term) &&
            !(scan.department?.toLowerCase().includes(term)) &&
            !(scan.serial?.toLowerCase().includes(term))) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'checked' && !scan.is_checked) return false;
      if (statusFilter === 'unchecked' && scan.is_checked) return false;

      // Department filter
      if (departmentFilter !== 'all' && scan.department !== departmentFilter) return false;

      return true;
    });
  }, [recentScans, searchTerm, statusFilter, departmentFilter]);

  // Get unique departments for filter
  const departments = Array.from(new Set(recentScans.map(s => s.department).filter(dept => dept && dept.trim() !== ''))) as string[];

  // Statistics
  const stats = useMemo(() => {
    const total = recentScans.length;
    const checked = recentScans.filter(s => s.is_checked).length;
    const unchecked = total - checked;
    const uniqueAssets = new Set(recentScans.map(s => s.id)).size;

    return { total, checked, unchecked, uniqueAssets };
  }, [recentScans]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewAsset = (asset: AssetWithInventoryStatus) => {
    setAssetDetailModal({ isOpen: true, asset, mode: 'view' });
  };

  const toggleSelectScan = (scanId: string) => {
    const newSelected = new Set(selectedScans);
    if (newSelected.has(scanId)) {
      newSelected.delete(scanId);
    } else {
      newSelected.add(scanId);
    }
    setSelectedScans(newSelected);
  };

  const selectAllScans = () => {
    if (selectedScans.size === filteredScans.length) {
      setSelectedScans(new Set());
    } else {
      setSelectedScans(new Set(filteredScans.map(s => s.id)));
    }
  };

  const handleBulkCheck = async () => {
    if (!user || selectedScans.size === 0) return;

    try {
      const userName = user.name || user.email || 'Unknown User';
      await checkAssets(Array.from(selectedScans), userName);
      setSelectedScans(new Set());
      toast.success(`Đã kiểm kê ${selectedScans.size} tài sản`);
    } catch (error) {
      console.error('Error checking assets:', error);
      toast.error('Có lỗi xảy ra khi kiểm kê');
    }
  };

  const handleBulkUncheck = async () => {
    if (selectedScans.size === 0) return;

    try {
      await uncheckAssets(Array.from(selectedScans));
      setSelectedScans(new Set());
      toast.success(`Đã bỏ kiểm kê ${selectedScans.size} tài sản`);
    } catch (error) {
      console.error('Error unchecking assets:', error);
      toast.error('Có lỗi xảy ra khi bỏ kiểm kê');
    }
  };


  const handleClearRecentScans = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử kiểm kê gần đây không?')) {
      clearRecentScans();
      setSelectedScans(new Set());
      toast.success('Đã xóa lịch sử kiểm kê gần đây');
    }
  };

  const handleRefresh = async () => {
    try {
      await loadAssets(true); // Force refresh bypassing cache
      toast.success('Đã cập nhật dữ liệu mới nhất');
    } catch (error) {
      console.error('Error refreshing assets:', error);
      toast.error('Có lỗi xảy ra khi cập nhật dữ liệu');
    }
  };

  // Register refresh function for network status component
  React.useEffect(() => {
    setRefreshFunction(() => handleRefresh);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction]);

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'all' || departmentFilter !== 'all';

  const clearAllFilters = () => {
    setStatusFilter('all');
    setDepartmentFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Container */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 relative z-30">
        {/* Header Section */}
        <div className="px-6 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="h-6 w-6 text-green-600" />
                Kiểm kê gần đây
              </h1>

              {/* WiFi & Refresh Button in Header */}
              <div className="flex items-center gap-3">
                <WiFiIndicator />
                <button
                  disabled={loading}
                  onClick={handleRefresh}
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                  title="Làm mới dữ liệu từ server"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* Dashboard Stats - Matching Assets and QR Scanner Tabs */}
            <div className="flex items-center gap-6 text-sm md:text-base border-b border-gray-100 pb-2">
              {/* Total Scans - Purple */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold text-sm md:text-base">Tổng:</span>
                <span className="font-bold text-purple-600 text-lg md:text-xl">{stats.total}</span>
              </div>

              <div className="w-px h-5 bg-gray-300"></div>

              {/* Checked Assets - Green */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold text-sm md:text-base">Đã kiểm:</span>
                <span className="font-bold text-green-600 text-lg md:text-xl">{stats.checked}</span>
              </div>

              <div className="w-px h-5 bg-gray-300"></div>

              {/* Unchecked Assets - Blue */}
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold text-sm md:text-base">Chưa kiểm:</span>
                <span className="font-bold text-blue-600 text-lg md:text-xl">{stats.unchecked}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 md:px-6 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={selectAllScans}
                disabled={filteredScans.length === 0}
                className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 shadow-md hover:shadow-lg"
              >
                {selectedScans.size === filteredScans.length && filteredScans.length > 0 ? (
                  <>
                    <X className="h-4 w-4" />
                    Bỏ chọn hết
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Chọn hết
                  </>
                )}
              </Button>


              <Button
                onClick={handleClearRecentScans}
                disabled={recentScans.length === 0}
                variant="outline"
                className="h-11 px-5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 shadow-md hover:shadow-lg"
              >
                <Trash2 className="h-4 w-4" />
                Xóa lịch sử
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedScans.size > 0 && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleBulkCheck}
                  className="h-11 px-5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 shadow-md hover:shadow-lg"
                >
                  <Check className="h-4 w-4" />
                  Kiểm kê ({selectedScans.size})
                </Button>

                <Button
                  onClick={handleBulkUncheck}
                  className="h-11 px-5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2.5 shadow-md hover:shadow-lg"
                >
                  <X className="h-4 w-4" />
                  Bỏ kiểm kê ({selectedScans.size})
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Tìm kiếm theo mã, tên, bộ phận, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-12 pr-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>

            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className={`h-10 px-4 font-semibold text-sm rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md ${
                hasActiveFilters
                  ? 'bg-orange-500 text-white border border-orange-500 hover:bg-orange-600'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Lọc</span>
              {hasActiveFilters && (
                <span className="bg-white text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {[statusFilter, departmentFilter].filter(f => f !== 'all').length}
                </span>
              )}
            </Button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'checked' | 'unchecked')}
                  className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="checked">Đã kiểm kê</option>
                  <option value="unchecked">Chưa kiểm kê</option>
                </select>

                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả bộ phận</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {hasActiveFilters && `${[statusFilter, departmentFilter].filter(f => f !== 'all').length} bộ lọc đang áp dụng`}
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Button
                      onClick={clearAllFilters}
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <FilterX className="h-4 w-4" />
                      Bỏ lọc
                    </Button>
                  )}

                  <Button
                    onClick={() => setShowFilters(false)}
                    size="sm"
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Xác nhận
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto pb-24 md:pb-4">
          <div className="px-4 md:px-6 py-4">
            {filteredScans.length === 0 ? (
              <div className="text-center py-16">
                <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {recentScans.length === 0 ? 'Chưa có lịch sử kiểm kê' : 'Không tìm thấy kết quả'}
                </h3>
                <p className="text-gray-500">
                  {recentScans.length === 0
                    ? 'Hãy bắt đầu quét QR hoặc kiểm kê tài sản để xem lịch sử tại đây'
                    : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredScans.map((scan) => (
                  <Card
                    key={`${scan.id}-${scan.checked_at || 'unchecked'}`}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                      selectedScans.has(scan.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleSelectScan(scan.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold text-sm ${
                              scan.is_checked ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {scan.asset_code}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              scan.is_checked
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {scan.is_checked ? (
                                <><CheckCircle className="h-3 w-3 mr-1" />Đã kiểm</>
                              ) : (
                                <><AlertCircle className="h-3 w-3 mr-1" />Chưa kiểm</>
                              )}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 text-sm leading-tight break-words">
                            {scan.name}
                          </h3>
                        </div>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAsset(scan);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 ml-2 flex-shrink-0 hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="h-3 w-3 text-gray-400" />
                          <span className="break-words">{scan.department || 'N/A'}</span>
                        </div>

                        {scan.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="break-words">{scan.location}</span>
                          </div>
                        )}

                        {scan.serial && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-3 w-3 text-gray-400" />
                            <span className="font-mono break-words">{scan.serial}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-100 space-y-1">
                          {scan.is_checked && scan.checked_by && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="break-words">{scan.checked_by}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="font-mono text-xs">
                              {scan.is_checked ? formatDate(scan.checked_at) : 'Chưa kiểm kê'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        asset={assetDetailModal.asset}
        isOpen={assetDetailModal.isOpen}
        onClose={() => setAssetDetailModal({ isOpen: false, asset: null, mode: 'view' })}
        mode={assetDetailModal.mode}
        onCheck={async (assetId, checkedBy) => {
          await checkAssets([assetId], checkedBy);
        }}
        onUncheck={(assetId) => uncheckAssets([assetId])}
      />
    </div>
  );
}
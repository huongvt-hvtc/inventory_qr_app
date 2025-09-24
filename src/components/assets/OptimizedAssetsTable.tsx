'use client';

import React from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import { AssetWithInventoryStatus } from '@/types';

interface OptimizedAssetsTableProps {
  assets: AssetWithInventoryStatus[];
  loading: boolean;
  error: string | null;
  selectedAssets: Set<string>;
  onSelectAsset: (assetId: string) => void;
  onSelectAll: () => void;
  onViewAsset: (asset: AssetWithInventoryStatus) => void;
  getStatusColor: (status: string) => string;
  showFilters: boolean;
}

export default function OptimizedAssetsTable({
  assets,
  loading,
  error,
  selectedAssets,
  onSelectAsset,
  onSelectAll,
  onViewAsset,
  getStatusColor,
  showFilters
}: OptimizedAssetsTableProps) {
  return (
    <div className={`${showFilters ? 'pt-10 md:pt-12' : 'pt-10 md:pt-12'} pb-6`}>

      {/* Assets Table */}
      <div className="bg-white px-4 md:px-6">
        <div className="overflow-hidden">
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}
          >
            <table className="w-full">
              {/* Table Header */}
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-20" style={{ position: 'sticky', top: 0 }}>
                <tr>
                  <th className="w-10 px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedAssets.size === assets.length && assets.length > 0}
                      onChange={onSelectAll}
                      className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mã TS</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Tên tài sản</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Model</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell">Serial</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden xl:table-cell">Tech Code</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Bộ phận</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Tình trạng</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100">
                {/* Loading State */}
                {loading && assets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-900">Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                )}

                {/* Error State */}
                {error && assets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <FolderOpen className="h-8 w-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Lỗi kết nối</h3>
                      <p className="text-gray-500 mb-4">Không thể tải dữ liệu</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Thử lại
                      </button>
                    </td>
                  </tr>
                )}

                {/* Asset Rows */}
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                        onViewAsset(asset);
                      }
                    }}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedAssets.has(asset.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelectAsset(asset.id);
                        }}
                        className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          asset.is_checked ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>
                        <span className={`font-medium text-sm ${
                          asset.is_checked ? 'text-green-700' : 'text-blue-700'
                        }`}>
                          {asset.asset_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <div className="text-gray-900 text-sm font-medium truncate max-w-[200px]" title={asset.name}>
                        {asset.name}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-sm hidden md:table-cell">
                      <div className="truncate max-w-[150px]" title={asset.model}>
                        {asset.model}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-sm font-mono hidden lg:table-cell">
                      <div className="truncate max-w-[120px]" title={asset.serial}>
                        {asset.serial}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-sm font-mono hidden xl:table-cell">
                      <div className="truncate max-w-[100px]" title={asset.tech_code}>
                        {asset.tech_code}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-sm hidden sm:table-cell">
                      <div className="truncate max-w-[120px]" title={asset.department}>
                        {asset.department}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(asset.status || '')}`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Empty State */}
                {assets.length === 0 && !loading && !error && (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <FolderOpen className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy tài sản</h3>
                      <p className="text-gray-500">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
// TypeScript type definitions for Asset Inventory QR Management System

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  google_id?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_code: string; // Mã tài sản
  name: string; // Tên tài sản
  model?: string; // Model
  serial?: string; // Serial
  tech_code?: string; // Tech Code
  department?: string; // Bộ phận
  status?: string; // Tình trạng
  location?: string; // Vị trí
  notes?: string; // Ghi chú
  qr_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryRecord {
  id: string;
  asset_id: string;
  asset_code: string;
  checked_by: string; // Người kiểm kê
  checked_at: string; // Thời gian kiểm kê
  location_found?: string; // Vị trí tìm thấy
  condition_found?: string; // Tình trạng tìm thấy
  notes?: string; // Ghi chú kiểm kê
  created_at: string;
}

export interface AssetWithInventoryStatus extends Asset {
  is_checked: boolean;
  checked_by?: string;
  checked_at?: string;
  inventory_notes?: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  created_at: string;
}

// Excel import/export column definitions
export interface ExcelColumn {
  header: string;
  key: keyof AssetWithInventoryStatus;
  type?: 'text' | 'number' | 'date' | 'boolean';
  width?: number;
}

// Asset management columns for display
export const ASSET_DISPLAY_COLUMNS: ExcelColumn[] = [
  { header: 'Check', key: 'is_checked', type: 'boolean', width: 80 },
  { header: 'Mã tài sản', key: 'asset_code', type: 'text', width: 120 },
  { header: 'Tên tài sản', key: 'name', type: 'text', width: 200 },
  { header: 'Model', key: 'model', type: 'text', width: 120 },
  { header: 'Serial', key: 'serial', type: 'text', width: 120 },
  { header: 'Tech Code', key: 'tech_code', type: 'text', width: 100 },
  { header: 'Bộ phận', key: 'department', type: 'text', width: 120 },
  { header: 'Tình trạng', key: 'status', type: 'text', width: 100 },
  { header: 'Vị trí', key: 'location', type: 'text', width: 150 },
];

// Excel import columns
export const EXCEL_IMPORT_COLUMNS: ExcelColumn[] = [
  { header: 'Mã tài sản', key: 'asset_code', type: 'text' },
  { header: 'Tên tài sản', key: 'name', type: 'text' },
  { header: 'Model', key: 'model', type: 'text' },
  { header: 'Serial', key: 'serial', type: 'text' },
  { header: 'Tech Code', key: 'tech_code', type: 'text' },
  { header: 'Bộ phận', key: 'department', type: 'text' },
  { header: 'Tình trạng', key: 'status', type: 'text' },
  { header: 'Vị trí', key: 'location', type: 'text' },
  { header: 'Ghi chú', key: 'notes', type: 'text' },
];

// Excel export columns (includes inventory info)
export const EXCEL_EXPORT_COLUMNS: ExcelColumn[] = [
  ...EXCEL_IMPORT_COLUMNS,
  { header: 'Đã kiểm kê', key: 'is_checked', type: 'boolean' },
  { header: 'Người kiểm kê', key: 'checked_by', type: 'text' },
  { header: 'Thời gian kiểm kê', key: 'checked_at', type: 'date' },
  { header: 'Ghi chú kiểm kê', key: 'inventory_notes', type: 'text' },
];

// QR code data structure
export interface QRCodeData {
  asset_code: string;
  name: string;
  model?: string;
  serial?: string;
  tech_code?: string;
  department?: string;
}

// Dashboard statistics
export interface DashboardStats {
  total_assets: number;
  checked_assets: number;
  unchecked_assets: number;
  completion_rate: number;
  recent_scans: InventoryRecord[];
}

// Filter options
export interface AssetFilters {
  search: string;
  department: string;
  status: string;
  location: string;
  inventory_status: 'all' | 'checked' | 'unchecked';
}

// Form validation errors
export interface FormErrors {
  [key: string]: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Asset status options
export const ASSET_STATUS_OPTIONS = [
  'Đang sử dụng',
  'Tốt',
  'Khá',
  'Trung bình',
  'Cũ',
  'Hỏng',
  'Bảo trì',
  'Thanh lý'
] as const;

export type AssetStatus = typeof ASSET_STATUS_OPTIONS[number];

// Navigation tab types
export type TabType = 'assets' | 'scanner';

// Print layout options
export interface PrintLayout {
  columns: number;
  rows: number;
  pageSize: 'A4';
}

export const PRINT_LAYOUTS: Record<string, PrintLayout> = {
  desktop: { columns: 2, rows: 3, pageSize: 'A4' },
  mobile: { columns: 1, rows: 6, pageSize: 'A4' },
};
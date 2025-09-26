// /src/components/assets/AssetDetailModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  QrCode,
  Edit,
  Check,
  X,
  Save,
  Calendar,
  User,
  Loader2,
  CheckCircle,
  Package,
  MapPin,
  Hash,
  FileText,
  Clock,
  AlertCircle,
  Monitor,
  Building,
  Settings,
  Tag,
  Cpu,
  Copy
} from 'lucide-react';
import { AssetWithInventoryStatus } from '@/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateQRCode } from '@/lib/qr';

interface AssetDetailModalProps {
  asset: AssetWithInventoryStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (asset: AssetWithInventoryStatus) => Promise<void>;
  onCheck?: (assetId: string, checkedBy: string) => Promise<void>;
  onUncheck?: (assetId: string) => Promise<void>;
  mode?: 'view' | 'edit' | 'create';
}

const statusOptions = [
  'Đang sử dụng',
  'Tốt',
  'Khá',
  'Cũ',
  'Hỏng',
  'Thanh lý',
  'Mất'
];

const departmentOptions = [
  'IT Department',
  'HR Department',
  'Finance Department',
  'Operations Department',
  'Marketing Department',
  'Admin Department',
  'Sales Department'
];

export default function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  onSave,
  onCheck,
  onUncheck,
  mode = 'view'
}: AssetDetailModalProps) {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(mode === 'edit' || mode === 'create');
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<AssetWithInventoryStatus>>({});

  // Update form data when asset prop changes
  useEffect(() => {
    if (asset) {
      setFormData({
        asset_code: asset.asset_code || '',
        name: asset.name || '',
        model: asset.model || '',
        serial: asset.serial || '',
        tech_code: asset.tech_code || '',
        status: asset.status || 'Đang sử dụng',
        location: asset.location || '',
        notes: asset.notes || '',
        department: asset.department || ''
      });
    } else {
      setFormData({
        asset_code: '',
        name: '',
        model: '',
        serial: '',
        tech_code: '',
        status: 'Đang sử dụng',
        location: '',
        notes: '',
        department: ''
      });
    }
  }, [asset]);

  useEffect(() => {
    setEditMode(mode === 'edit' || mode === 'create');
  }, [mode]);

  const handleInputChange = (field: keyof AssetWithInventoryStatus, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.asset_code || !formData.name) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setLoading(true);
    try {
      if (onSave) {
        const assetData: AssetWithInventoryStatus = {
          id: asset?.id || '',
          asset_code: formData.asset_code!,
          name: formData.name!,
          model: formData.model || '',
          serial: formData.serial || '',
          tech_code: formData.tech_code || '',
          department: formData.department || '',
          status: formData.status || 'Đang sử dụng',
          location: formData.location || '',
          notes: formData.notes || '',
          qr_generated: asset?.qr_generated || false,
          is_checked: asset?.is_checked || false,
          checked_by: asset?.checked_by || undefined,
          checked_at: asset?.checked_at || undefined,
          created_at: asset?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await onSave(assetData);
        setEditMode(false);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu tài sản');
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!asset || !onCheck || !user) return;

    setLoading(true);
    try {
      const userName = user.name || user.email || 'Unknown User';
      await onCheck(asset.id, userName);
      toast.success('✅ Đã xác nhận kiểm kê');
      onClose();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  const handleUncheck = async () => {
    if (!asset || !onUncheck) return;

    setLoading(true);
    try {
      await onUncheck(asset.id);
      toast.success('Đã bỏ kiểm kê');
      onClose();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi bỏ kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  const showQR = async () => {
    if (!asset) return;

    setQrLoading(true);
    setShowQRModal(true);

    try {
      const qrContent = JSON.stringify({
        asset_code: asset.asset_code,
        name: asset.name,
        model: asset.model,
        serial: asset.serial,
        tech_code: asset.tech_code,
        department: asset.department,
        status: asset.status,
        location: asset.location
      });

      const qrUrl = await generateQRCode(qrContent);
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Có lỗi xảy ra khi tạo mã QR');
      setShowQRModal(false);
    } finally {
      setQrLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang sử dụng': return 'bg-green-100 text-green-800 border-green-200';
      case 'Tốt': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Khá': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cũ': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Hỏng': return 'bg-red-100 text-red-800 border-red-200';
      case 'Thanh lý': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Mất': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] md:max-h-[85vh] flex flex-col p-0 mx-2 md:mx-auto">
        {/* Compact Header */}
        <DialogHeader className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {mode === 'create' ? 'Thêm tài sản mới' : 'Chi tiết tài sản'}
          </DialogTitle>
        </DialogHeader>

        {/* Compact Sticky Asset Info */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 space-y-3">
          {/* Status & QR Button Row */}
          {asset && !editMode && (
            <div className="flex items-center justify-between">
              {asset.is_checked ? (
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Đã kiểm kê
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Chưa kiểm kê
                </span>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={showQR}
                className="h-12 px-4 bg-purple-600 border-purple-600 text-white hover:bg-purple-700 font-semibold"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Xem QR
              </Button>
            </div>
          )}

          {/* Asset Code & Name in Two Columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Asset Code */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Hash className="h-3 w-3 text-gray-400" />
                Mã tài sản
              </label>
              {editMode ? (
                <Input
                  value={formData.asset_code}
                  onChange={(e) => handleInputChange('asset_code', e.target.value)}
                  placeholder="Nhập mã..."
                  className="h-12 text-sm font-medium"
                  required
                />
              ) : (
                <div className="flex items-start gap-2">
                  <div className={`font-bold text-base break-words flex-1 min-w-0 ${asset?.is_checked ? 'text-green-600' : 'text-blue-600'}`}>
                    {asset?.asset_code}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (asset?.asset_code) {
                        navigator.clipboard.writeText(asset.asset_code);
                        toast.success('Đã copy mã tài sản!');
                      }
                    }}
                    className="h-8 w-8 p-0 shrink-0 mt-0.5"
                    title="Copy mã tài sản"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Asset Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Package className="h-3 w-3 text-gray-400" />
                Tên tài sản
              </label>
              {editMode ? (
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nhập tên..."
                  className="h-12 text-sm font-medium"
                  required
                />
              ) : (
                <div className="font-semibold text-sm text-gray-900 leading-tight break-words">{asset?.name}</div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-3">

            {/* Technical Details Group */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1">
                Thông tin kỹ thuật
              </h3>

              {/* Model & Serial Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Monitor className="h-3 w-3 text-gray-400" />
                    Model
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      placeholder="Nhập model..."
                      className="h-12 text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 break-words">{asset?.model || '-'}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Tag className="h-3 w-3 text-gray-400" />
                    Serial
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.serial}
                      onChange={(e) => handleInputChange('serial', e.target.value)}
                      placeholder="Nhập serial..."
                      className="h-12 text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 font-mono break-words">{asset?.serial || '-'}</div>
                  )}
                </div>
              </div>

              {/* Tech Code & Department Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-gray-400" />
                    Tech Code
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.tech_code}
                      onChange={(e) => handleInputChange('tech_code', e.target.value)}
                      placeholder="Nhập tech code..."
                      className="h-12 text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 font-mono break-words">{asset?.tech_code || '-'}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Building className="h-3 w-3 text-gray-400" />
                    Bộ phận
                  </label>
                  {editMode ? (
                    <Select
                      value={formData.department}
                      onValueChange={(value) => handleInputChange('department', value)}
                    >
                      <SelectTrigger className="h-12 text-sm">
                        <SelectValue placeholder="Chọn bộ phận" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-gray-700 break-words">{asset?.department || '-'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Status & Location Group */}
            <div className="bg-blue-50 rounded-lg p-3 space-y-3">
              <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-200 pb-1">
                Trạng thái & Vị trí
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Settings className="h-3 w-3 text-gray-400" />
                    Tình trạng
                  </label>
                  {editMode ? (
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger className="h-12 text-sm">
                        <SelectValue placeholder="Chọn tình trạng" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(asset?.status || '')}`}>
                      {asset?.status}
                    </span>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    Vị trí
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Nhập vị trí..."
                      className="h-12 text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 break-words">{asset?.location || '-'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Group */}
            <div className="bg-green-50 rounded-lg p-3 space-y-3">
              <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide border-b border-green-200 pb-1">
                Thông tin khác
              </h3>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <FileText className="h-3 w-3 text-gray-400" />
                  Ghi chú
                </label>
                {editMode ? (
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Nhập ghi chú..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                ) : (
                  <div className="text-sm text-gray-700 bg-white p-2 rounded border border-green-200 min-h-[40px] break-words">
                    {asset?.notes || 'Không có ghi chú'}
                  </div>
                )}
              </div>
            </div>

            {/* Audit Details Group */}
            {!editMode && asset && (
              <div className="bg-purple-50 rounded-lg p-3 space-y-3">
                <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide border-b border-purple-200 pb-1">
                  Thông tin kiểm kê
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Checked By */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <User className="h-3 w-3 text-gray-400" />
                      Người kiểm kê
                    </label>
                    <div className="text-sm text-gray-700">
                      {asset.checked_by || 'Chưa có'}
                    </div>
                  </div>

                  {/* Checked At */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      Thời gian kiểm kê
                    </label>
                    <div className="text-sm text-gray-700 font-mono">
                      {formatDate(asset.checked_at || '')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Professional Footer */}
        <DialogFooter className="px-4 py-3 border-t bg-gray-50">
          <div className="flex gap-2 w-full">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    if (mode === 'create') {
                      onClose();
                    } else {
                      setEditMode(false);
                      if (asset) {
                        setFormData({
                          asset_code: asset.asset_code || '',
                          name: asset.name || '',
                          model: asset.model || '',
                          serial: asset.serial || '',
                          tech_code: asset.tech_code || '',
                          status: asset.status || 'Đang sử dụng',
                          location: asset.location || '',
                          notes: asset.notes || '',
                          department: asset.department || ''
                        });
                      }
                    }
                  }}
                  disabled={loading}
                  className="flex-1 h-12 font-semibold"
                >
                  <X className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="lg"
                  className="flex-1 h-12 font-semibold bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Lưu
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onClose}
                  className="flex-1 h-12 font-semibold"
                >
                  Đóng
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setEditMode(true)}
                  className="flex-1 h-12 font-semibold border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Sửa
                </Button>

                {asset?.is_checked ? (
                  <Button
                    onClick={handleUncheck}
                    disabled={loading}
                    size="lg"
                    className="flex-1 h-12 font-semibold bg-red-600 hover:bg-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Bỏ kiểm kê
                  </Button>
                ) : (
                  <Button
                    onClick={handleCheck}
                    disabled={loading || !user}
                    size="lg"
                    className="flex-1 h-12 font-semibold bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Xử lý...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Kiểm kê
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* QR Code Modal */}
    <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
      <DialogContent className="max-w-3xl max-h-[80vh] md:max-h-[85vh] overflow-y-auto mx-2 md:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Mã QR
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 md:p-6">
          {qrLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600 text-sm">Đang tạo mã QR...</span>
            </div>
          ) : qrCodeUrl && asset ? (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-3 md:p-6">
              {/* Mobile Layout: Stacked */}
              <div className="md:hidden space-y-4">
                {/* QR Code - Mobile */}
                <div className="flex flex-col items-center space-y-2">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code for ${asset.asset_code}`}
                    className="w-32 h-32 border-2 border-gray-300 p-1 bg-white"
                  />
                  <div className="px-3 py-1.5 bg-blue-600 text-white font-bold text-sm rounded">
                    {asset.asset_code}
                  </div>
                </div>

                {/* Asset Info - Mobile: Single Column, One Line Per Field */}
                <div className="space-y-2">
                  <h3 className="font-bold text-base mb-2 pb-2 border-b border-gray-300 break-words leading-tight">
                    {asset.name}
                  </h3>

                  <div className="space-y-1 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="font-semibold text-gray-600">Model:</span> <span className="text-gray-900 break-words">{asset.model || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-2 rounded border">
                      <span className="font-semibold text-gray-600">Serial:</span> <span className="text-gray-900 font-mono break-words">{asset.serial || 'N/A'}</span>
                    </div>

                    <div className="bg-gray-50 p-2 rounded">
                      <span className="font-semibold text-gray-600">Tech Code:</span> <span className="text-gray-900 font-mono break-words">{asset.tech_code || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-2 rounded border">
                      <span className="font-semibold text-gray-600">Bộ phận:</span> <span className="text-gray-900 break-words">{asset.department || 'N/A'}</span>
                    </div>

                    <div className="bg-gray-50 p-2 rounded">
                      <span className="font-semibold text-gray-600">Tình trạng:</span> <span className="text-gray-900 break-words">{asset.status || 'N/A'}</span>
                    </div>

                    <div className="bg-white p-2 rounded border">
                      <span className="font-semibold text-gray-600">Vị trí:</span> <span className="text-gray-900 break-words">{asset.location || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout: Side by Side */}
              <div className="hidden md:flex gap-6">
                {/* QR Code - Desktop */}
                <div className="flex flex-col items-center space-y-3">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code for ${asset.asset_code}`}
                    className="w-48 h-48 border-2 border-gray-300 p-2 bg-white"
                  />
                  <div className="px-4 py-2 bg-blue-600 text-white font-bold text-lg rounded">
                    {asset.asset_code}
                  </div>
                </div>

                {/* Asset Info - Desktop */}
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-xl mb-4 pb-2 border-b-2 border-gray-300 break-words leading-tight">
                    {asset.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-600">Model:</span>
                      <p className="text-gray-900 break-words">{asset.model || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Serial:</span>
                      <p className="text-gray-900 font-mono break-words">{asset.serial || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Tech Code:</span>
                      <p className="text-gray-900 font-mono break-words">{asset.tech_code || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Bộ phận:</span>
                      <p className="text-gray-900 break-words">{asset.department || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Tình trạng:</span>
                      <p className="text-gray-900 break-words">{asset.status || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Vị trí:</span>
                      <p className="text-gray-900 break-words">{asset.location || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={() => setShowQRModal(false)} className="h-10 md:h-12 px-4 md:px-6 font-semibold w-full md:w-auto">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
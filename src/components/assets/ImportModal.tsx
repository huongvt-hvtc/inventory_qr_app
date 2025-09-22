'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import { AssetWithInventoryStatus } from '@/types';
import { parseExcelFile, validateExcelFile, validateAssets, downloadTemplate } from '@/lib/excel';
import toast from 'react-hot-toast';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (assets: AssetWithInventoryStatus[], duplicates?: { asset: any; existingAsset: AssetWithInventoryStatus }[]) => Promise<void>;
  existingAssets: AssetWithInventoryStatus[];
}

interface ValidationResult {
  valid: AssetWithInventoryStatus[];
  invalid: { row: number; asset: any; errors: string[] }[];
  duplicates: { row: number; asset: any; existingAsset: AssetWithInventoryStatus }[];
}

export default function ImportModal({ isOpen, onClose, onImport, existingAssets }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [step, setStep] = useState<'upload' | 'validate' | 'import'>('upload');
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateExcelFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error || 'File không hợp lệ');
      return;
    }

    setFile(selectedFile);
    setStep('validate');
  };

  const handleValidateFile = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const assets = await parseExcelFile(file);
      const validation = await validateAssets(assets, existingAssets);
      setValidationResult(validation);
      setStep('import');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi xử lý file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult) return;

    if (validationResult.valid.length === 0 && (!overwriteDuplicates || validationResult.duplicates.length === 0)) {
      return;
    }

    setLoading(true);
    try {
      if (overwriteDuplicates && validationResult.duplicates.length > 0) {
        // Pass both valid assets and duplicates for overwrite handling
        await onImport(validationResult.valid, validationResult.duplicates);
      } else {
        // Only import valid assets (skip duplicates)
        await onImport(validationResult.valid);
      }
      // Don't show toast here - let the parent component handle it to avoid duplicates
      handleClose();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi import dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadTemplate();
      toast.success('Đã tải xuống template thành công');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tải template');
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResult(null);
    setStep('upload');
    setOverwriteDuplicates(false);
    onClose();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import tài sản từ Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Upload File */}
          {step === 'upload' && (
            <>
              {/* Download Template */}
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Tải xuống template Excel
                    </h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Tải xuống file mẫu để đảm bảo định dạng đúng khi import dữ liệu.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleDownloadTemplate}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Tải template
                    </Button>
                  </div>
                </div>
              </Card>

              {/* File Upload */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Chọn file Excel</h3>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Chọn file Excel
                      </label>
                      <input
                        ref={fileInputRef}
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="sr-only"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Chỉ hỗ trợ file .xlsx và .xls (tối đa 10MB)
                    </p>
                  </div>
                </div>

                {/* Upload Requirements */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Yêu cầu file Excel:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Có header với tên cột chính xác</li>
                    <li>• Cột "Mã tài sản" và "Tên tài sản" là bắt buộc</li>
                    <li>• Mã tài sản phải duy nhất</li>
                    <li>• Dữ liệu bắt đầu từ dòng thứ 2</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Validate File */}
          {step === 'validate' && file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">File đã chọn</h3>
                <Button variant="outline" size="sm" onClick={handleRemoveFile}>
                  <X className="h-4 w-4 mr-2" />
                  Xóa file
                </Button>
              </div>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{file.name}</div>
                    <div className="text-sm text-gray-500">
                      Kích thước: {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              </Card>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    Hệ thống sẽ kiểm tra tính hợp lệ của dữ liệu trước khi import.
                    Các dòng không hợp lệ sẽ được báo cáo để bạn có thể chỉnh sửa.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Import Results */}
          {step === 'import' && validationResult && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Kết quả kiểm tra</h3>

              {/* Valid Assets */}
              {validationResult.valid.length > 0 && (
                <Card className="p-4 border-green-200 bg-green-50">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">
                        {validationResult.valid.length} tài sản hợp lệ
                      </div>
                      <div className="text-sm text-green-800">
                        Các tài sản này sẽ được import vào hệ thống
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Invalid Assets */}
              {validationResult.invalid.length > 0 && (
                <Card className="p-4 border-red-200 bg-red-50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">
                          {validationResult.invalid.length} dòng có lỗi
                        </div>
                        <div className="text-sm text-red-800">
                          Các lỗi này cần được sửa trước khi import
                        </div>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                      {validationResult.invalid.map((item, index) => (
                        <div key={index} className="border-t border-red-200 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
                          <div className="text-sm font-medium text-red-900">
                            Dòng {item.row}: {item.asset.asset_code || item.asset.name || 'N/A'}
                          </div>
                          <ul className="text-xs text-red-800 ml-4 mt-1">
                            {item.errors.map((error, errorIndex) => (
                              <li key={errorIndex}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Duplicate Assets */}
              {validationResult.duplicates && validationResult.duplicates.length > 0 && (
                <Card className="p-4 border-orange-200 bg-orange-50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-orange-600" />
                      <div>
                        <div className="font-medium text-orange-900">
                          {validationResult.duplicates.length} tài sản trùng lặp
                        </div>
                        <div className="text-sm text-orange-800">
                          Các tài sản này đã tồn tại trong hệ thống
                        </div>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto bg-white rounded-lg border border-orange-200 p-3">
                      {validationResult.duplicates.map((item, index) => (
                        <div key={index} className="border-b border-orange-100 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
                          <div className="text-sm font-medium text-orange-900">
                            Dòng {item.row}: {item.asset.asset_code} - {item.asset.name}
                          </div>
                          <div className="text-xs text-orange-700 ml-4 mt-1">
                            • Trùng với: {item.existingAsset.asset_code} - {item.existingAsset.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Compact Overwrite Options - Separate Section */}
              {validationResult.duplicates && validationResult.duplicates.length > 0 && (
                <Card className="p-4 border-indigo-200 bg-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-indigo-600" />
                      <h4 className="font-medium text-indigo-900">Xử lý tài sản trùng lặp:</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className={`
                        flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium
                        ${!overwriteDuplicates
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                        }
                      `}>
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={!overwriteDuplicates}
                          onChange={() => setOverwriteDuplicates(false)}
                          className="sr-only"
                        />
                        🚫 Bỏ qua
                      </label>

                      <label className={`
                        flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium
                        ${overwriteDuplicates
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-white text-amber-600 border border-amber-300 hover:bg-amber-50'
                        }
                      `}>
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={overwriteDuplicates}
                          onChange={() => setOverwriteDuplicates(true)}
                          className="sr-only"
                        />
                        ⚠️ Ghi đè
                      </label>
                    </div>
                  </div>
                </Card>
              )}

              {validationResult.valid.length === 0 && validationResult.duplicates.length === 0 && (
                <Card className="p-4 border-gray-200">
                  <div className="text-center text-gray-500">
                    Không có dữ liệu hợp lệ để import
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose}>
            {step === 'import' ? 'Đóng' : 'Hủy'}
          </Button>

          {step === 'validate' && (
            <Button onClick={handleValidateFile} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                'Kiểm tra file'
              )}
            </Button>
          )}

          {step === 'import' && validationResult && (
            (() => {
              const validCount = validationResult.valid.length;
              const duplicateCount = validationResult.duplicates.length;
              const totalToImport = validCount + (overwriteDuplicates ? duplicateCount : 0);

              return totalToImport > 0 ? (
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang import...
                    </>
                  ) : (
                    `Import ${totalToImport} tài sản${overwriteDuplicates && duplicateCount > 0 ? ` (${duplicateCount} ghi đè)` : ''}`
                  )}
                </Button>
              ) : null;
            })()
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
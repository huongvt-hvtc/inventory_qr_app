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
import { Card } from '@/components/ui/card';
import {
  QrCode,
  Printer,
  Eye,
  Loader2
} from 'lucide-react';
import { Asset } from '@/types';
import { generateQRCode } from '@/lib/qr';
import toast from 'react-hot-toast';

interface QRPrintModalProps {
  assets: Asset[];
  isOpen: boolean;
  onClose: () => void;
}

interface QRCodeData {
  asset: Asset;
  qrDataUrl: string;
}

export default function QRPrintModal({ assets, isOpen, onClose }: QRPrintModalProps) {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const qrPerPage = 6; // Flexible: up to 6 QR codes per page

  useEffect(() => {
    if (isOpen && assets.length > 0) {
      setCurrentPage(1); // Reset to first page when modal opens
      generateQRCodes();
    }
  }, [isOpen, assets]);

  const generateQRCodes = async () => {
    setLoading(true);
    let toastId: string | null = null;

    try {
      const qrData: QRCodeData[] = [];
      const assetCount = assets.length;

      console.log('Generating QR codes for assets:', assets.map(a => ({ id: a.id, asset_code: a.asset_code, name: a.name })));

      // Show progress toast for multiple QR codes
      if (assetCount > 3) {
        toastId = toast.loading(`Đang tạo mã QR... 0% (0/${assetCount})`, { duration: Infinity });
      }

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        // Create QR data with asset information
        const qrContent = JSON.stringify({
          asset_code: asset.asset_code,
          name: asset.name,
          model: asset.model,
          serial: asset.serial,
          tech_code: asset.tech_code,
          department: asset.department
        });

        const qrDataUrl = await generateQRCode(qrContent);
        qrData.push({ asset, qrDataUrl });
        console.log('Generated QR for:', asset.asset_code, asset.name);

        // Update progress
        if (toastId) {
          const progress = Math.round(((i + 1) / assetCount) * 100);
          toast.loading(`Đang tạo mã QR... ${progress}% (${i + 1}/${assetCount})`, { id: toastId });
        }
      }

      setQrCodes(qrData);
      console.log('Final QR codes data:', qrData.map(q => ({ asset_code: q.asset.asset_code, name: q.asset.name })));

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      toast.success(`✅ Đã tạo ${assetCount} mã QR thành công`);
    } catch (error) {
      // Dismiss progress toast on error
      if (toastId) toast.dismiss(toastId);

      console.error('Error generating QR codes:', error);
      toast.error('❌ Có lỗi xảy ra khi tạo mã QR');
    } finally {
      setLoading(false);
    }
  };


  const totalPages = Math.ceil(qrCodes.length / qrPerPage);
  const startIndex = (currentPage - 1) * qrPerPage;
  const endIndex = startIndex + qrPerPage;
  const currentQRCodes = qrCodes.slice(startIndex, endIndex);

  const handlePrint = () => {
    if (qrCodes.length === 0) {
      toast.error('Không có mã QR để in');
      return;
    }

    const assetCount = qrCodes.length;
    let toastId: string | null = null;

    // Show progress toast for multiple assets being prepared for print
    if (assetCount > 3) {
      toastId = toast.loading(`Đang chuẩn bị in ${assetCount} mã QR... 25%`, { duration: Infinity });
    }

    // Make print area visible for printing
    const printArea = document.querySelector('.print-area') as HTMLElement;
    if (printArea) {
      printArea.style.position = 'static';
      printArea.style.left = 'auto';
      printArea.style.top = 'auto';
      printArea.style.visibility = 'visible';
    }

    // Update progress
    if (toastId) {
      toast.loading(`Đang chuẩn bị in ${assetCount} mã QR... 50%`, { id: toastId });
    }

    let printStarted = false;
    let cleanupExecuted = false;

    const cleanup = () => {
      if (cleanupExecuted) return;
      cleanupExecuted = true;

      if (printArea) {
        printArea.style.position = 'absolute';
        printArea.style.left = '-9999px';
        printArea.style.top = '-9999px';
        printArea.style.visibility = 'hidden';
      }

      // Dismiss progress toast
      if (toastId) {
        toast.dismiss(toastId);
      }
    };

    const beforePrintHandler = () => {
      printStarted = true;
      // Update progress when print dialog opens
      if (toastId) {
        toast.loading(`Đang in ${assetCount} mã QR... 90%`, { id: toastId });
      }
    };

    const afterPrintHandler = () => {
      // Only show success message if print actually started
      if (printStarted) {
        // Dismiss progress toast first
        if (toastId) {
          toast.dismiss(toastId);
        }
        toast.success(`✅ Đã gửi ${assetCount} mã QR đến máy in`);
      }

      cleanup();

      // Remove event listeners
      window.removeEventListener('beforeprint', beforePrintHandler);
      window.removeEventListener('afterprint', afterPrintHandler);
    };

    // Add event listeners
    window.addEventListener('beforeprint', beforePrintHandler);
    window.addEventListener('afterprint', afterPrintHandler);

    // Update progress before triggering print
    if (toastId) {
      toast.loading(`Đang mở hộp thoại in... 75%`, { id: toastId });
    }

    // Trigger print
    setTimeout(() => {
      window.print();
    }, 100);

    // Fallback cleanup in case events don't fire (safety net)
    setTimeout(() => {
      if (!printStarted) {
        cleanup();
        window.removeEventListener('beforeprint', beforePrintHandler);
        window.removeEventListener('afterprint', afterPrintHandler);
      }
    }, 5000);
  };

  // PDF functionality removed due to Vietnamese font issues

  const QRCodeCard = ({ qrCodeData }: { qrCodeData: QRCodeData }) => {
    const { asset, qrDataUrl } = qrCodeData;

    return (
      <Card className="p-6 break-inside-avoid h-full border border-gray-400 shadow-lg bg-white">
        <div className="flex gap-6 h-full">
          {/* Left side - QR Code and Asset Code */}
          <div className="flex flex-col items-center justify-center space-y-4 flex-shrink-0">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-300 shadow-sm">
              <img
                src={qrDataUrl}
                alt={`QR Code for ${asset.asset_code}`}
                className="w-28 h-28"
              />
            </div>
            <div className="px-3 py-2 rounded-lg font-bold text-lg text-center text-blue-700 bg-blue-50 border border-blue-200">
              {asset.asset_code}
            </div>
          </div>

          {/* Right side - Asset Information */}
          <div className="flex-1 flex flex-col justify-start py-2">
            {/* Asset Name */}
            <div className="mb-4 pb-3 border-b-2 border-blue-200">
              <div className="font-extrabold text-xl text-gray-900 leading-tight">
                {asset.name}
              </div>
            </div>

            {/* Asset Details */}
            <div className="space-y-3 flex-1 text-sm">
              {asset.model && (
                <div className="flex items-center py-1">
                  <span className="font-semibold text-gray-600 w-20 text-sm">Model:</span>
                  <span className="text-gray-900 font-medium text-sm">{asset.model}</span>
                </div>
              )}

              {asset.serial && (
                <div className="flex items-center py-1">
                  <span className="font-semibold text-gray-600 w-20 text-sm">Serial:</span>
                  <span className="text-gray-900 font-medium text-sm font-mono">{asset.serial}</span>
                </div>
              )}

              {asset.tech_code && (
                <div className="flex items-center py-1">
                  <span className="font-semibold text-gray-600 w-20 text-sm">Tech Code:</span>
                  <span className="text-gray-900 font-medium text-sm font-mono">{asset.tech_code}</span>
                </div>
              )}

              {asset.department && (
                <div className="flex items-center py-1">
                  <span className="font-semibold text-gray-600 w-20 text-sm">Bộ phận:</span>
                  <span className="text-blue-700 font-bold text-sm">{asset.department}</span>
                </div>
              )}

              {asset.status && (
                <div className="flex items-center py-1">
                  <span className="font-semibold text-gray-600 w-20 text-sm">Tình trạng:</span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {asset.status}
                  </span>
                </div>
              )}

              {asset.location && (
                <div className="flex items-center py-1">
                  <span className="font-semibold text-gray-600 w-20 text-sm">Vị trí:</span>
                  <span className="text-gray-900 font-medium text-sm">{asset.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              In mã QR ({assets.length} tài sản)
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Đang tạo mã QR...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Print Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">
                      Xem trước
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 font-medium">
                        Trang {currentPage}/{totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Trang trước
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Trang sau
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* QR Grid - Optimized 2 columns, 4 rows (8 QR codes per page) */}
                  <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                    {Array.from({ length: qrPerPage }, (_, index) => {
                      const qrCodeData = currentQRCodes[index];
                      return qrCodeData ? (
                        <div key={startIndex + index} className="min-h-[160px]">
                          <QRCodeCard qrCodeData={qrCodeData} />
                        </div>
                      ) : (
                        <div key={`empty-${index}`} className="min-h-[160px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                          Empty Slot {index + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Print Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Thông tin in</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Tổng số mã QR: {qrCodes.length}</p>
                    <p>• Số trang: {totalPages}</p>
                    <p>• Khổ giấy: A4</p>
                    <p>• Bố cục: 2 cột × 3 hàng (6 mã QR/trang)</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Đóng
            </Button>
            <Button
              onClick={handlePrint}
              disabled={loading || qrCodes.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              In ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles - CHỈ SỬA PHẦN NÀY */}
      <style jsx global>{`
        @media print {
          * {
            visibility: hidden;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .print-area,
          .print-area * {
            visibility: visible !important;
          }

          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: block !important;
          }

          @page {
            size: A4 portrait;
            margin: 15mm;
          }

          @media print {
            html, body {
              height: auto !important;
              overflow: visible !important;
            }
          }

          .print-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 3mm !important;
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }

          .print-area {
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          .print-qr-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 2px solid #1f2937 !important;
            background: white !important;
            padding: 4mm !important;
            width: 99mm !important;
            height: 93mm !important;
            border-radius: 3mm !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            overflow: hidden !important;
          }

          /* Tên tài sản - Title */
          .print-qr-card .asset-name-header {
            font-size: 13pt !important;
            font-weight: 800 !important;
            color: #1f2937 !important;
            text-align: center !important;
            margin-bottom: 2mm !important;
            padding: 2mm !important;
            background: #f8f9fa !important;
            border: 1px solid #d1d5db !important;
            border-radius: 2mm !important;
            line-height: 1.2 !important;
            max-height: 12mm !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            white-space: normal !important;
            box-shadow: none !important;
          }

          /* Main content area */
          .print-qr-card .asset-content {
            display: flex !important;
            gap: 5mm !important;
            flex: 1 !important;
            align-items: flex-start !important;
            padding-top: 1mm !important;
          }

          /* QR Code section */
          .print-qr-card .qr-section {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 2mm !important;
            width: 32mm !important;
            flex-shrink: 0 !important;
          }

          .print-qr-card .qr-code-container {
            background: #f8fafc !important;
            padding: 2mm !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 2mm !important;
            box-shadow: none !important;
          }

          .print-qr-card .qr-code {
            width: 28mm !important;
            height: 28mm !important;
            display: block !important;
          }

          .print-qr-card .asset-code {
            font-size: 12pt !important;
            font-weight: bold !important;
            color: #2563eb !important;
            background: none !important;
            padding: 1mm 0 !important;
            border-radius: 0 !important;
            text-align: center !important;
            min-width: 28mm !important;
            line-height: 1.2 !important;
            box-shadow: none !important;
            letter-spacing: 0.3px !important;
            border: none !important;
          }

          /* Details section */
          .print-qr-card .details-section {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            gap: 2mm !important;
            padding: 2mm !important;
            background: #fafbfc !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 2mm !important;
            box-shadow: none !important;
            height: fit-content !important;
            overflow: hidden !important;
          }

          .print-qr-card .detail-item {
            display: flex !important;
            font-size: 10pt !important;
            line-height: 1.3 !important;
            align-items: flex-start !important;
            padding: 1mm 0 !important;
            border-bottom: 1px solid #f1f3f4 !important;
            overflow: hidden !important;
          }

          .print-qr-card .detail-item:last-child {
            border-bottom: none !important;
          }

          .print-qr-card .detail-label {
            font-weight: 700 !important;
            color: #374151 !important;
            width: 18mm !important;
            flex-shrink: 0 !important;
            font-size: 9pt !important;
          }

          .print-qr-card .detail-value {
            color: #1f2937 !important;
            font-weight: 500 !important;
            font-size: 10pt !important;
            word-break: break-word !important;
            line-height: 1.3 !important;
            overflow-wrap: break-word !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .print-qr-card .department-value {
            color: #1d4ed8 !important;
            font-weight: bold !important;
            background: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            font-size: 10pt !important;
            display: inline !important;
          }

        }
      `}</style>

      {/* Print area - SINGLE CONTAINER APPROACH TO FIX BLANK PAGES */}
      {qrCodes.length > 0 && (
        <div className="print-area" style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
          <div className="print-container">
            {qrCodes.map((qrCodeData, index) => {
              const { asset, qrDataUrl } = qrCodeData;
              return (
                <div key={index} className="print-qr-card">
                  {/* Tên tài sản - Tiêu đề */}
                  <div className="asset-name-header">
                    {asset.name || 'N/A'}
                  </div>

                  {/* Nội dung chính */}
                  <div className="asset-content">
                    {/* QR Code bên trái */}
                    <div className="qr-section">
                      <div className="qr-code-container">
                        <img
                          src={qrDataUrl}
                          alt={`QR ${asset.asset_code}`}
                          className="qr-code"
                        />
                      </div>
                      <div className="asset-code">
                        {asset.asset_code}
                      </div>
                    </div>

                    {/* Chi tiết bên phải */}
                    <div className="details-section">
                      <div className="detail-item">
                        <span className="detail-label">Model:</span>
                        <span className="detail-value">{asset.model || 'N/A'}</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Serial:</span>
                        <span className="detail-value">{asset.serial || 'N/A'}</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Tech Code:</span>
                        <span className="detail-value">{asset.tech_code || 'N/A'}</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Bộ phận:</span>
                        <span className="detail-value department-value">{asset.department || 'N/A'}</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Tình trạng:</span>
                        <span className="detail-value">{asset.status || 'N/A'}</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Vị trí:</span>
                        <span className="detail-value">{asset.location || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
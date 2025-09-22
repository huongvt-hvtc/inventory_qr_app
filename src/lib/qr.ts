// QR Code generation and printing utilities
import QRCode from 'qrcode';
import type { AssetWithInventoryStatus, QRCodeData, PrintLayout } from '@/types';

// Generate QR code data string
export function generateQRCodeData(asset: AssetWithInventoryStatus): string {
  // Simple format: asset_code for easy scanning
  return asset.asset_code;
}

// Generate QR code as data URL
export async function generateQRCode(data: string, options: {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
} = {}): Promise<string> {
  try {
    const qrOptions = {
      width: options.width || 200,
      margin: options.margin || 2,
      color: {
        dark: options.color?.dark || '#000000',
        light: options.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: 'M' as const,
    };

    return await QRCode.toDataURL(data, qrOptions);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Lỗi tạo mã QR');
  }
}

// Generate QR codes for multiple assets
export async function generateBulkQRCodes(assets: AssetWithInventoryStatus[]): Promise<{
  asset: AssetWithInventoryStatus;
  qrCode: string;
  qrData: string;
}[]> {
  const results = [];

  for (const asset of assets) {
    try {
      const qrData = generateQRCodeData(asset);
      const qrCode = await generateQRCode(qrData, { width: 300 });

      results.push({
        asset,
        qrCode,
        qrData
      });
    } catch (error) {
      console.error(`Error generating QR for asset ${asset.asset_code}:`, error);
      // Continue with other assets even if one fails
    }
  }

  return results;
}

// Create QR label HTML for printing
export function createQRLabelHTML(
  asset: AssetWithInventoryStatus,
  qrCode: string,
  options: {
    showCompanyName?: boolean;
    companyName?: string;
  } = {}
): string {
  const companyName = options.companyName || process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company';

  return `
    <div class="qr-label">
      <div class="qr-header">
        ${options.showCompanyName !== false ? `<div class="company-name">${companyName}</div>` : ''}
        <div class="asset-title">ASSET INVENTORY</div>
      </div>

      <div class="qr-content">
        <div class="qr-code-container">
          <img src="${qrCode}" alt="QR Code for ${asset.asset_code}" class="qr-code-image">
        </div>

        <div class="asset-info">
          <div class="asset-code">${asset.asset_code}</div>
          <div class="asset-name">${asset.name}</div>
          ${asset.model ? `<div class="asset-detail">Model: ${asset.model}</div>` : ''}
          ${asset.serial ? `<div class="asset-detail">S/N: ${asset.serial}</div>` : ''}
          ${asset.tech_code ? `<div class="asset-detail">Tech: ${asset.tech_code}</div>` : ''}
          ${asset.department ? `<div class="asset-department">${asset.department}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Create print page with QR labels
export function createPrintPage(
  qrLabels: { asset: AssetWithInventoryStatus; qrCode: string }[],
  layout: PrintLayout = { columns: 2, rows: 3, pageSize: 'A4' }
): string {
  const labelsPerPage = layout.columns * layout.rows;
  const totalPages = Math.ceil(qrLabels.length / labelsPerPage);

  let printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>QR Code Labels</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.2;
        }

        .page {
          width: 100%;
          height: 100vh;
          display: grid;
          grid-template-columns: repeat(${layout.columns}, 1fr);
          grid-template-rows: repeat(${layout.rows}, 1fr);
          gap: 2mm;
          page-break-after: always;
        }

        .page:last-child {
          page-break-after: avoid;
        }

        .qr-label {
          border: 1px solid #000;
          padding: 3mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: white;
        }

        .qr-header {
          text-align: center;
          margin-bottom: 2mm;
        }

        .company-name {
          font-size: 8px;
          font-weight: bold;
          color: #666;
          margin-bottom: 1mm;
        }

        .asset-title {
          font-size: 10px;
          font-weight: bold;
          color: #000;
        }

        .qr-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .qr-code-container {
          margin-bottom: 2mm;
        }

        .qr-code-image {
          width: 40mm;
          height: 40mm;
          display: block;
        }

        .asset-info {
          text-align: center;
          width: 100%;
        }

        .asset-code {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 1mm;
          color: #000;
        }

        .asset-name {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 1mm;
          color: #333;
          word-wrap: break-word;
          hyphens: auto;
        }

        .asset-detail {
          font-size: 8px;
          color: #666;
          margin-bottom: 0.5mm;
        }

        .asset-department {
          font-size: 9px;
          color: #444;
          font-weight: bold;
          margin-top: 1mm;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; }
          .page { height: 100vh; }
        }
      </style>
    </head>
    <body>
  `;

  // Generate pages
  for (let page = 0; page < totalPages; page++) {
    printHTML += '<div class="page">';

    const startIndex = page * labelsPerPage;
    const endIndex = Math.min(startIndex + labelsPerPage, qrLabels.length);

    for (let i = startIndex; i < endIndex; i++) {
      const { asset, qrCode } = qrLabels[i];
      printHTML += createQRLabelHTML(asset, qrCode, { showCompanyName: true });
    }

    // Fill empty cells if needed
    const emptyCells = labelsPerPage - (endIndex - startIndex);
    for (let i = 0; i < emptyCells; i++) {
      printHTML += '<div class="qr-label"></div>';
    }

    printHTML += '</div>';
  }

  printHTML += `
    </body>
    </html>
  `;

  return printHTML;
}

// Open print dialog with QR labels
export async function printQRLabels(
  assets: AssetWithInventoryStatus[],
  layout: PrintLayout = { columns: 2, rows: 3, pageSize: 'A4' }
): Promise<void> {
  try {
    // Generate QR codes for all assets
    const qrLabels = await generateBulkQRCodes(assets);

    if (qrLabels.length === 0) {
      throw new Error('Không thể tạo mã QR cho các tài sản đã chọn');
    }

    // Create print page
    const printHTML = createPrintPage(qrLabels, layout);

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Trình duyệt chặn popup. Vui lòng cho phép popup và thử lại.');
    }

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

  } catch (error) {
    console.error('Error printing QR labels:', error);
    throw error;
  }
}

// Create preview HTML for QR labels (mobile/desktop)
export function createPreviewHTML(
  qrLabels: { asset: AssetWithInventoryStatus; qrCode: string }[],
  isMobile: boolean = false
): string {
  const columns = isMobile ? 1 : 2;

  let previewHTML = `
    <div style="
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      gap: 10px;
      padding: 10px;
      max-width: 800px;
      margin: 0 auto;
    ">
  `;

  qrLabels.forEach(({ asset, qrCode }) => {
    previewHTML += `
      <div style="
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        background: white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
          ${process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company'}
        </div>
        <img src="${qrCode}" alt="QR Code" style="width: 120px; height: 120px; margin-bottom: 10px;">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${asset.asset_code}</div>
        <div style="font-size: 14px; margin-bottom: 5px; color: #333;">${asset.name}</div>
        ${asset.model ? `<div style="font-size: 12px; color: #666;">Model: ${asset.model}</div>` : ''}
        ${asset.serial ? `<div style="font-size: 12px; color: #666;">S/N: ${asset.serial}</div>` : ''}
        ${asset.department ? `<div style="font-size: 12px; color: #444; margin-top: 5px; font-weight: bold;">${asset.department}</div>` : ''}
      </div>
    `;
  });

  previewHTML += '</div>';
  return previewHTML;
}

// Generate single QR code for asset detail view
export async function generateAssetQRCode(asset: AssetWithInventoryStatus): Promise<string> {
  const qrData = generateQRCodeData(asset);
  return await generateQRCode(qrData, { width: 256 });
}
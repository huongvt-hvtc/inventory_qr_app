# 📦 Hệ thống Quản lý Tài sản bằng QR Code

## 🎯 Tổng quan

Hệ thống quản lý và kiểm kê tài sản chuyên nghiệp sử dụng công nghệ QR Code, được xây dựng với Next.js 14, Supabase và PWA. Hỗ trợ quét QR trên cả mobile và desktop với khả năng offline.

### ✨ Tính năng chính

- 📱 **Quét QR Code chuyên nghiệp** với 3 phiên bản scanner tối ưu
- 🏷️ **Tạo và in mã QR hàng loạt** cho tài sản
- 📊 **Dashboard thống kê** real-time
- 📤 **Import/Export Excel** với SheetJS
- 🔄 **Đồng bộ offline** với PWA
- 👥 **Hỗ trợ đa người dùng** (20+ concurrent)
- 🔐 **Bảo mật** với Supabase RLS

## 🚀 Cài đặt nhanh

### 1. Clone dự án

```bash
git clone https://github.com/yourusername/inventory-qr-app.git
cd inventory-qr-app
```

### 2. Cài đặt dependencies

```bash
npm install
# hoặc
pnpm install
```

### 3. Setup Supabase

1. Tạo project tại [supabase.com](https://supabase.com)
2. Chạy SQL trong `database-schema.sql`
3. Copy API keys vào `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Chạy development

```bash
npm run dev
```

Truy cập: http://localhost:3000

## 📱 QR Scanner Components

### OptimizedScanner (Recommended)
**Path:** `/components/scanner/OptimizedScanner.tsx`

```tsx
import OptimizedScanner from '@/components/scanner/OptimizedScanner'

<OptimizedScanner
  onScanSuccess={(code) => console.log(code)}
  onScanError={(error) => console.error(error)}
/>
```

**Features:**
- Auto permission handling
- Responsive design
- Animation feedback
- Duplicate prevention
- Error recovery

### ProScanner (Advanced)
**Path:** `/components/scanner/ProScanner.tsx`

- Statistics dashboard
- Scan history
- Manual input
- Quick settings

### SimpleScanner (Basic)
**Path:** `/components/scanner/SimpleScanner.tsx`

- Lightweight
- Basic functionality
- Easy to customize

## 🏷️ QR Code Generation

### Tạo QR đơn lẻ

```typescript
import { generateAssetQR } from '@/lib/qr-utils'

const qrDataUrl = await generateAssetQR(asset)
```

### Tạo QR hàng loạt

```typescript
import { generateBulkQR } from '@/lib/qr-utils'

const qrCodes = await generateBulkQR(assets)
```

### In QR codes

```typescript
import { printQRCodes } from '@/lib/qr-utils'

await printQRCodes(assets)
```

## 📊 Database Schema

### Tables

1. **assets** - Thông tin tài sản
2. **inventory_cycles** - Kỳ kiểm kê
3. **inventory_scans** - Chi tiết kiểm kê
4. **activity_logs** - Nhật ký hoạt động

### Ràng buộc quan trọng

```sql
UNIQUE(asset_id, cycle_id) -- Chống quét trùng trong kỳ
```

## 📤 Import/Export Excel

### Import template

```typescript
const EXCEL_COLUMNS = {
  'Mã tài sản': 'asset_code',
  'Tên (Tiếng Việt)': 'name_vi',
  'Model': 'model',
  'Serial': 'serial',
  'Phòng ban': 'department',
  'Vị trí': 'location',
  // ...
}
```

### Export functions

```typescript
// Export all assets
exportToExcel(assets, 'all-assets.xlsx')

// Export checked only
exportToExcel(checkedAssets, 'checked-assets.xlsx')

// Export unchecked
exportToExcel(uncheckedAssets, 'unchecked-assets.xlsx')
```

## 🌐 PWA Configuration

### manifest.json

```json
{
  "name": "Asset Management System",
  "short_name": "AssetMgmt",
  "display": "standalone",
  "theme_color": "#10b981",
  "background_color": "#ffffff"
}
```

### Offline Support

- Service Worker caching
- IndexedDB for local data
- Background sync
- Queue for offline actions

## 🚦 API Routes

### Assets
- `GET /api/assets` - Lấy danh sách tài sản
- `POST /api/assets` - Tạo tài sản mới
- `PUT /api/assets/[id]` - Cập nhật tài sản
- `DELETE /api/assets/[id]` - Xóa tài sản

### Inventory
- `POST /api/inventory/scan` - Ghi nhận kiểm kê
- `GET /api/inventory/stats` - Thống kê kiểm kê
- `POST /api/inventory/cycle` - Tạo kỳ kiểm kê

## 📈 Performance Optimization

### Target Metrics
- Time to first scan: < 3s
- Scan recognition: < 500ms
- Memory usage: < 50MB
- Support: 10,000+ assets
- Concurrent users: 20+

### Optimization Tips

1. **Lazy loading components**
```tsx
const Scanner = dynamic(() => import('@/components/scanner/OptimizedScanner'), {
  ssr: false
})
```

2. **Image optimization**
```tsx
<Image
  src="/qr-code.png"
  width={256}
  height={256}
  priority
/>
```

3. **Database indexing**
```sql
CREATE INDEX idx_assets_code ON assets(code);
CREATE INDEX idx_inventory_scans_cycle ON inventory_scans(cycle_id);
```

## 🔧 Troubleshooting

### Camera không hoạt động

1. **Check HTTPS**: Phải dùng HTTPS hoặc localhost
2. **Permissions**: Settings → Site Settings → Camera
3. **Browser**: Try Chrome/Firefox latest

### Quét QR chậm

1. Tăng độ sáng màn hình
2. Khoảng cách 15-30cm
3. Giữ camera ổn định
4. Dùng camera sau trên mobile

### Offline không sync

1. Check Service Worker status
2. Clear cache: Settings → Clear browsing data
3. Check IndexedDB quota

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Build production

```bash
npm run build
npm start
```

## 📝 Testing Checklist

### Desktop
- [ ] Chrome 80+
- [ ] Firefox 75+
- [ ] Safari 14+
- [ ] Edge 80+

### Mobile
- [ ] iOS Safari 14+
- [ ] Chrome Android
- [ ] Samsung Browser

### Features
- [ ] QR scanning works
- [ ] Manual input works
- [ ] Export Excel works
- [ ] Print QR works
- [ ] Offline mode works
- [ ] Multi-user works

## 🛠️ Development

### Project Structure

```
/src
  /app              # Next.js app router
    /scanner        # Scanner page
    /assets         # Assets management
    /test-scanners  # Test page
  /components
    /scanner        # Scanner components
    /qr            # QR generation
    /assets        # Asset components
    /ui            # UI components
  /lib             # Utilities
  /hooks           # React hooks
  /types           # TypeScript types
```

### Key Files

- `/app/scanner/page.tsx` - Main scanner page
- `/components/scanner/OptimizedScanner.tsx` - Production scanner
- `/lib/qr-utils.ts` - QR utilities
- `/lib/supabase.ts` - Database client

### Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [html5-qrcode Library](https://github.com/mebjas/html5-qrcode)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file

## 👨‍💻 Support

- Email: support@example.com
- Issues: GitHub Issues
- Documentation: `/docs`

---

**Built with ❤️ by Your Team**

*Last updated: December 2024*

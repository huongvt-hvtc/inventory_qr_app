# 📋 KIỂM KÊ TÀI SẢN - INVENTORY QR APP

Hệ thống quản lý tài sản với mã QR thế hệ mới. PWA cho phép scan QR, quản lý tài sản, và làm việc offline.

## 🎯 TÍNH NĂNG CHÍNH

### ✅ Quản lý tài sản
- Thêm/sửa/xóa tài sản với thông tin chi tiết
- Mã QR tự động cho từng tài sản
- Import/Export Excel hàng loạt
- Tìm kiếm và lọc thông minh

### ✅ QR Scanner
- Scan QR bằng camera thiết bị
- Hoạt động offline với Service Worker
- Lịch sử scan tự động lưu
- Tích hợp với kiểm kê

### ✅ Kiểm kê số
- Ghi nhận tình trạng tài sản
- Cập nhật vị trí, tình trạng
- Báo cáo kiểm kê chi tiết
- Xuất báo cáo Excel

### ✅ PWA (Progressive Web App)
- Cài đặt như app native
- Hoạt động offline
- Push notifications
- Fast loading với caching

### ✅ UI/UX tối ưu
- Mobile-first responsive design
- Dark/Light mode
- Grab-style navigation
- Touch-friendly interface

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Frontend Stack
- **Next.js 15** - React framework với App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **React Hot Toast** - Notifications

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Main database
- **Row Level Security** - Data protection
- **Real-time subscriptions** - Live updates

### PWA Features
- **Service Worker** - Offline caching
- **Web Manifest** - App installation
- **Camera API** - QR scanning
- **Local Storage** - Offline data

## 🔧 CÀI ĐẶT & TRIỂN KHAI

### Prerequisites
```bash
Node.js 18+
pnpm hoặc npm
Git
```

### 1. Clone repository
```bash
git clone <repository-url>
cd inventory-qr-app
```

### 2. Install dependencies
```bash
pnpm install
# hoặc
npm install
```

### 3. Setup environment
Tạo file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Setup Supabase
- Tạo project mới trên supabase.com
- Import schema từ `COMPLETE_DATABASE_SCHEMA.sql`
- Enable Authentication với Google OAuth

### 5. Development
```bash
# Development server
pnpm dev

# Production build
pnpm build

# Start production
pnpm start
```

### 6. Deploy
- **Vercel**: `vercel deploy`
- **Netlify**: Connect Git repository
- **Self-hosted**: Build và serve với nginx

## 📱 HƯỚNG DẪN SỬ DỤNG

### Đăng nhập
1. Mở app qua browser
2. Chọn "Đăng nhập với Google"
3. Cho phép quyền truy cập

### Quản lý tài sản
1. Vào tab "Tài sản"
2. Nhấn "+" để thêm mới
3. Điền thông tin: mã, tên, model, vị trí
4. Lưu để tự động tạo QR

### Scan QR
1. Vào tab "QR Scanner"
2. Cho phép camera
3. Quét mã QR tài sản
4. Xem thông tin chi tiết

### Kiểm kê
1. Scan QR tài sản
2. Cập nhật vị trí hiện tại
3. Ghi chú tình trạng
4. Lưu kiểm kê

### Xuất báo cáo
1. Vào tab "Tài sản"
2. Chọn "Xuất Excel"
3. Download file Excel

## 🗂️ CẤU TRÚC PROJECT

```
inventory-qr-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── assets/            # Quản lý tài sản
│   │   ├── scanner/           # QR Scanner
│   │   ├── guide/             # Hướng dẫn
│   │   ├── settings/          # Thiết lập
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── assets/           # Asset components
│   │   ├── scanner/          # Scanner components
│   │   ├── layout/           # Layout components
│   │   └── ui/               # UI components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilities
│   └── types/                # TypeScript types
├── public/                   # Static assets
├── database/                 # Database schemas
└── docs/                     # Documentation
```

## 🔒 BẢO MẬT

### Authentication
- Google OAuth 2.0
- JWT tokens với Supabase Auth
- Session management
- Auto logout khi hết hạn

### Authorization
- Row Level Security (RLS)
- User chỉ xem data của mình
- Admin có quyền toàn bộ
- Policy-based access control

### Data Protection
- HTTPS bắt buộc
- Input validation
- SQL injection prevention
- XSS protection

## 📊 DATABASE SCHEMA

### Core Tables
- **users**: Thông tin người dùng
- **assets**: Danh sách tài sản
- **inventory_records**: Lịch sử kiểm kê
- **activity_logs**: Log hoạt động

### Relationships
```sql
users -> assets (created_by)
assets -> inventory_records (asset_id)
users -> activity_logs (user_id)
assets -> qr_codes (asset_id)
```

## 🚀 PERFORMANCE

### Optimization
- Image optimization với Next.js
- Code splitting tự động
- Service Worker caching
- Database indexing
- Lazy loading components

### Metrics
- Lighthouse Score: 95+
- First Contentful Paint: <1.5s
- Cumulative Layout Shift: <0.1
- Time to Interactive: <3s

## 🔧 TROUBLESHOOTING

### Camera không hoạt động
- Kiểm tra HTTPS (bắt buộc cho camera)
- Cho phép quyền camera trong browser
- Thử browser khác (Chrome recommended)

### Không kết nối Supabase
- Kiểm tra network connection
- Verify environment variables
- Check Supabase project status

### PWA không install được
- Kiểm tra manifest.json
- HTTPS requirement
- Service Worker registration

## 📈 ROADMAP

### Phase 1 ✅ (Completed)
- Basic CRUD operations
- QR code generation/scanning
- PWA functionality
- Google authentication

### Phase 2 🚧 (In Progress)
- Advanced reporting
- Bulk operations
- Admin dashboard
- Email notifications

### Phase 3 📋 (Planned)
- Mobile app (React Native)
- API endpoints
- Integrations
- Advanced analytics

## 🤝 ĐÓNG GÓP

### Development
1. Fork repository
2. Create feature branch
3. Commit changes
4. Create Pull Request

### Bug Reports
1. Mô tả chi tiết lỗi
2. Steps to reproduce
3. Screenshots nếu có
4. Browser/device info

## 📞 LIÊN HỆ

**Developer**: huongvt-hvtc
**Email**: huongvt.hvtc@gmail.com
**GitHub**: https://github.com/your-username

## 📄 LICENSE

MIT License - Xem file LICENSE để biết chi tiết

---

**📱 Kiểm kê tài sản QR**
*Phiên bản 2.0 - Modern PWA for Asset Management*
*Developed with ❤️ in Vietnam*

---

## 🛠️ TECHNICAL DETAILS

### Environment Setup
```bash
# Required Node.js version
node --version  # Should be 18+

# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

### Database Functions
```sql
-- Get user assets
SELECT * FROM assets WHERE created_by = 'user-email';

-- Record inventory check
INSERT INTO inventory_records (asset_id, checked_by, location_found)
VALUES ('asset-uuid', 'user-email', 'New Location');

-- Generate activity log
INSERT INTO activity_logs (user_id, action, resource_type)
VALUES ('user-uuid', 'scan_qr', 'asset');
```

### API Endpoints
```typescript
// Get assets
GET /api/assets

// Create asset
POST /api/assets
Body: { name, model, serial, location }

// Update asset
PUT /api/assets/[id]
Body: { updates }

// Delete asset
DELETE /api/assets/[id]
```

### PWA Configuration
```json
// manifest.json
{
  "name": "Kiểm kê tài sản",
  "short_name": "QR Assets",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
```

## 🔍 DEBUGGING

### Enable Debug Mode
```typescript
// Add to .env.local
NEXT_PUBLIC_DEBUG=true

// In code
if (process.env.NEXT_PUBLIC_DEBUG) {
  console.log('Debug info:', data);
}
```

### Common Issues

**1. Build errors**
```bash
# Clear cache
pnpm clean
rm -rf .next node_modules
pnpm install
```

**2. Database connection**
```bash
# Test connection
curl -X GET "your-supabase-url/rest/v1/assets" \
  -H "apikey: your-anon-key"
```

**3. Authentication issues**
```bash
# Check Google OAuth setup
# Verify redirect URLs
# Test with different browsers
```

---

*Cập nhật lần cuối: $(date)*
*Phiên bản: 2.0.0*
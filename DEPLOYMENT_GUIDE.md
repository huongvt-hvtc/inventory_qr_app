# 📚 HƯỚNG DẪN TRIỂN KHAI HOÀN CHỈNH - Inventory QR App

## 🚀 Tổng quan hệ thống

App quản lý tài sản bằng QR Code với các tính năng:
- ✅ Quản lý License theo email (không cần key)
- ✅ Nhiều công ty (database riêng) cho mỗi license
- ✅ Phân quyền user theo từng công ty
- ✅ Giới hạn đăng nhập 1 mobile + 1 desktop
- ✅ PWA hỗ trợ offline
- ✅ Import/Export Excel
- ✅ In tem QR hàng loạt

## 📋 Kiến trúc hệ thống

```
┌─────────────────────┐
│   Admin Portal      │ ← Quản lý License (Admin Only)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Main App (PWA)    │ ← App chính cho users
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Supabase Backend   │
│  - PostgreSQL DB    │
│  - Auth (Google)    │
│  - Storage          │
└─────────────────────┘
```

---

## 🛠️ BƯỚC 1: Setup Supabase

### 1.1. Tạo Project Supabase

1. Truy cập [supabase.com](https://supabase.com)
2. Tạo project mới với:
   - **Project name**: inventory-qr-app
   - **Database Password**: [Tạo password mạnh]
   - **Region**: Singapore (gần VN nhất)

### 1.2. Chạy Database Schema

Vào **SQL Editor** và chạy lần lượt các file:

#### File 1: Core Tables (`database-schema.sql`)
```sql
-- Copy toàn bộ nội dung file database-schema.sql
-- Tạo các bảng: users, assets, inventory_records, activity_logs
```

#### File 2: License System (`database/license-schema.sql`)
```sql
-- Copy toàn bộ nội dung file database/license-schema.sql
-- Tạo các bảng: licenses, companies, license_members, company_permissions
```

#### File 3: Session Tracking (`database/session-tracking.sql`)
```sql
-- Copy toàn bộ nội dung file database/session-tracking.sql
-- Tạo bảng user_sessions và các functions
```

### 1.3. Setup Google OAuth

1. Trong Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google**
3. Copy **Redirect URL** từ Supabase
4. Truy cập [Google Cloud Console](https://console.cloud.google.com)
5. Tạo OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Authorized redirect URIs**: Paste URL từ Supabase
6. Copy **Client ID** và **Client Secret** về Supabase

### 1.4. Tạo Admin User

```sql
-- Chạy trong SQL Editor
-- Thay your-email@gmail.com bằng email admin của bạn
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@gmail.com';
```

---

## 🖥️ BƯỚC 2: Setup Code & Deploy

### 2.1. Clone và Setup Local

```bash
# Clone project
git clone [your-repo-url]
cd inventory-qr-app

# Install dependencies
npm install

# Tạo file .env.local
cp .env.local.example .env.local
```

### 2.2. Configure Environment Variables

Edit `.env.local`:
```env
# Supabase Config
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# App Config
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_ADMIN_EMAIL=admin@yourcompany.com

# Optional: Email (nếu cần)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2.3. Test Local

```bash
# Development mode
npm run dev

# Test HTTPS cho PWA camera
npm run dev:https
```

Truy cập:
- Main App: https://localhost:3000
- Admin: https://localhost:3000/admin

---

## 🚢 BƯỚC 3: Deploy lên Production

### Option A: Deploy với Vercel (Recommended)

1. Push code lên GitHub/GitLab
2. Truy cập [vercel.com](https://vercel.com)
3. Import project từ Git
4. Configure Environment Variables (paste từ .env.local)
5. Deploy!

### Option B: Deploy với Netlify

1. Build project:
```bash
npm run build
```

2. Deploy folder `.next` lên Netlify
3. Set Environment Variables trong Netlify Dashboard

### Option C: Self-hosted VPS

```bash
# Trên server
git clone [repo]
cd inventory-qr-app
npm install
npm run build

# Dùng PM2 để chạy
npm install -g pm2
pm2 start npm --name "inventory-qr" -- start
pm2 save
pm2 startup
```

---

## 📱 BƯỚC 4: Setup PWA

### 4.1. Yêu cầu HTTPS
- **Production**: Bắt buộc HTTPS cho camera
- **Vercel/Netlify**: Tự động có HTTPS
- **VPS**: Dùng Let's Encrypt

### 4.2. Install PWA trên devices

#### iPhone/iPad:
1. Mở Safari → your-domain.com
2. Tap Share → Add to Home Screen
3. Đặt tên: "Kiểm kê QR"

#### Android:
1. Mở Chrome → your-domain.com
2. Menu → Add to Home Screen
3. Accept install

---

## 💼 BƯỚC 5: Quản lý License

### 5.1. Tạo License đầu tiên

1. Login Admin Portal: `/admin`
2. Tab **Quản lý License**
3. Click **Tạo License**:
   - Email: customer@company.com
   - Gói: Pro
   - Thời hạn: 12 tháng
   - Số user: 10
   - Số công ty: 3
   - Giá: 12,000,000 VNĐ

### 5.2. Gửi thông tin cho khách

```
Email Subject: 🎉 Kích hoạt License - Inventory QR App

Chào [Tên khách hàng],

License của bạn đã được tạo!

📧 Email đăng nhập: customer@company.com
📦 Gói dịch vụ: Pro
⏰ Thời hạn: 12 tháng
👥 Số user: 10
🏢 Số công ty: 3

HƯỚNG DẪN SỬ DỤNG:
1. Truy cập: https://your-app.com
2. Đăng nhập bằng Google với email trên
3. Vào Thiết lập → Tạo công ty
4. Mời thành viên
5. Bắt đầu quản lý tài sản!

Support: support@yourcompany.com
```

---

## 🔧 BƯỚC 6: Cấu hình chi tiết

### 6.1. Phân quyền

| Role | Quyền hạn |
|------|-----------|
| **Admin** | Quản lý tất cả licenses, xem mọi dữ liệu |
| **License Owner** | Tạo công ty, mời user, phân quyền |
| **Company Admin** | Toàn quyền trong công ty được phân |
| **Member** | Xem, thêm, sửa tài sản |
| **Viewer** | Chỉ xem, không sửa |

### 6.2. Giới hạn hệ thống

| Tham số | Giá trị | Ghi chú |
|---------|---------|---------|
| Max assets per company | 10,000 | Có thể tăng |
| Concurrent users | 20 | Realtime |
| Session timeout | 24h | Tự động logout |
| Device limit | 1 mobile + 1 desktop | Per user |
| File upload | 10MB | Excel/Images |

---

## ✅ BƯỚC 7: Checklist kiểm thử

### 7.1. Test Admin Portal
- [ ] Login với admin account
- [ ] Tạo license mới
- [ ] Xem danh sách licenses
- [ ] Xóa license test

### 7.2. Test User Flow
- [ ] Login với email có license
- [ ] Tạo công ty mới
- [ ] Mời thành viên
- [ ] Phân quyền cho user

### 7.3. Test Asset Management
- [ ] Upload Excel danh sách tài sản
- [ ] Tạo và in QR codes
- [ ] Scan QR bằng mobile
- [ ] Export báo cáo Excel

### 7.4. Test Device Limits
- [ ] Login trên mobile 1 → OK
- [ ] Login trên mobile 2 → Confirm dialog
- [ ] Login trên desktop → OK
- [ ] Login desktop 2 → Confirm dialog

### 7.5. Test PWA Offline
- [ ] Install PWA
- [ ] Tắt mạng
- [ ] Xem được data cached
- [ ] Bật mạng → Sync OK

---

## 🐛 Troubleshooting

### Issue 1: Camera không hoạt động
```
✓ Check HTTPS enabled
✓ Check browser permissions
✓ Test với localhost HTTPS
```

### Issue 2: Login failed
```
✓ Check Google OAuth config
✓ Check redirect URLs match
✓ Check Supabase anon key
```

### Issue 3: License không active
```
✓ Check valid_from/valid_until dates
✓ Check license status = 'active'
✓ Run: UPDATE licenses SET status = 'active' WHERE id = 'xxx';
```

### Issue 4: PWA không install được
```
✓ Check manifest.json
✓ Check HTTPS
✓ Check service worker registered
```

---

## 📊 Monitoring & Analytics

### Database Queries hữu ích

```sql
-- Xem tổng quan licenses
SELECT 
  owner_email,
  plan_type,
  status,
  valid_until,
  current_companies || '/' || max_companies as companies,
  current_members || '/' || max_members as members
FROM licenses
ORDER BY created_at DESC;

-- Xem sessions đang active
SELECT 
  user_email,
  device_type,
  last_active_at
FROM user_sessions
WHERE last_active_at > NOW() - INTERVAL '24 hours'
ORDER BY last_active_at DESC;

-- Thống kê assets theo công ty
SELECT 
  c.name as company,
  COUNT(a.id) as total_assets,
  COUNT(CASE WHEN ir.id IS NOT NULL THEN 1 END) as checked_assets
FROM companies c
LEFT JOIN assets a ON a.company_id = c.id
LEFT JOIN inventory_records ir ON ir.asset_id = a.id
GROUP BY c.id, c.name;
```

---

## 📞 Support Contacts

- **Technical Support**: tech@yourcompany.com
- **Sales**: sales@yourcompany.com
- **Emergency Hotline**: +84 900 123 456
- **Documentation**: https://docs.yourapp.com
- **Status Page**: https://status.yourapp.com

---

## 🎉 Launch Checklist

### Pre-Launch
- [ ] Domain và SSL ready
- [ ] Backup strategy defined
- [ ] Admin accounts created
- [ ] Test licenses created
- [ ] Documentation updated

### Launch Day
- [ ] Deploy to production
- [ ] Test all critical paths
- [ ] Monitor error logs
- [ ] Announce to users
- [ ] Support team ready

### Post-Launch
- [ ] Monitor performance
- [ ] Collect user feedback
- [ ] Fix urgent bugs
- [ ] Plan next features
- [ ] Update documentation

---

## 📈 Pricing Strategy

| Plan | Công ty | Users | Assets | Giá/năm |
|------|---------|-------|--------|---------|
| **Basic** | 1 | 5 | 1,000 | 5M VNĐ |
| **Pro** | 3 | 10 | 5,000 | 12M VNĐ |
| **Max** | 5 | 25 | 10,000 | 25M VNĐ |
| **Enterprise** | Unlimited | Unlimited | Unlimited | 50M VNĐ |

---

**🚀 App đã sẵn sàng cho production!**

Nếu cần support, liên hệ development team.

---

*Last updated: 2024*
*Version: 2.0 - Multi-company with Email License System*

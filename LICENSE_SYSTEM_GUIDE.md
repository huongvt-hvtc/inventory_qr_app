# 🔐 License Key Subscription System - Deployment Guide

## 📖 Tổng quan

Hệ thống License Key cho phép bạn bán subscription theo mô hình:
- **Thanh toán ngoài** (chuyển khoản, Momo, ZaloPay)
- **Cấp license key** cho khách hàng
- **Khách hàng kích hoạt** trong app
- **Theo dõi usage** và quản lý giới hạn

## 🚀 Triển khai

### **Bước 1: Chạy Database Schema**

1. Mở **Supabase Dashboard** → SQL Editor
2. Copy toàn bộ nội dung file `database/license-schema.sql`
3. Paste và **Run** để tạo tables và functions

### **Bước 2: Set Admin User**

```sql
-- Thay 'your-admin@email.com' bằng email admin của bạn
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
WHERE email = 'your-admin@email.com';
```

### **Bước 3: Update Contact Info**

Sửa thông tin liên hệ trong các file:
- `src/components/license/LicenseActivation.tsx` (line 54-57)
- `src/components/license/LicenseUsageDisplay.tsx` (line 205-207)
- `src/app/admin/page.tsx` (nếu cần)

```typescript
// Thay đổi thông tin contact
📧 Email: sales@yourcompany.com
📱 Hotline: 0900 123 456
💬 Zalo/Telegram: @yourcompany
```

### **Bước 4: Deploy App**

```bash
# Build và deploy như bình thường
npm run build
# Deploy lên Vercel/Netlify/server của bạn
```

## 💼 Quy trình bán hàng

### **1. Sales Process**

```
Khách hàng liên hệ
    ↓
Demo & tư vấn package
    ↓
Báo giá & thông tin thanh toán
    ↓
Khách hàng chuyển khoản
    ↓
Tạo license key & gửi khách hàng
    ↓
Khách hàng kích hoạt trong app
```

### **2. Package Pricing**

| Package | Công ty | Users | Assets | Giá |
|---------|---------|-------|--------|-----|
| **Basic** | 1 | 10 | 1,000 | 5,000,000 VNĐ/năm |
| **Pro** | 3 | 50 | 5,000 | 12,000,000 VNĐ/năm |
| **Enterprise** | Unlimited | Unlimited | Unlimited | 25,000,000 VNĐ/năm |

### **3. Tạo License Key**

1. Login với **admin account**
2. Truy cập `/admin`
3. Click **"Tạo License"**
4. Điền thông tin:
   - Tên công ty khách hàng
   - Email khách hàng
   - Chọn package (Basic/Pro/Enterprise)
   - Thời hạn (mặc định 12 tháng)
5. Click **"Tạo License"**
6. Copy license key gửi cho khách hàng

**Ví dụ license key:** `INV-2024-PRO-A1B2C3D4`

### **4. Email Template cho khách hàng**

```
Subject: 🎉 License Key - Inventory QR App

Chào [Tên khách hàng],

Cảm ơn bạn đã mua Inventory QR App!

📋 THÔNG TIN LICENSE:
• License Key: INV-2024-PRO-A1B2C3D4
• Công ty: [Tên công ty]
• Package: Pro
• Có hiệu lực đến: [Ngày hết hạn]

🚀 HƯỚNG DẪN KÍCH HOẠT:
1. Mở app → tab "Thiết lập"
2. Tìm phần "Kích hoạt License"
3. Nhập license key: INV-2024-PRO-A1B2C3D4
4. Nhập tên công ty: [Tên công ty]
5. Click "Kích hoạt License"

✅ SAU KHI KÍCH HOẠT:
• Tạo được 3 công ty
• Mời được 50 users
• Quản lý 5,000 tài sản
• Xuất Excel, API access

📞 HỖ TRỢ:
• Email: sales@yourcompany.com
• Hotline: 0900 123 456
• Zalo: @yourcompany

Chúc bạn sử dụng hiệu quả!
```

## 🎛️ Quản trị hệ thống

### **Admin Panel (`/admin`)**

**Chức năng:**
- ✅ Xem tất cả license keys
- ✅ Tạo license key mới
- ✅ Theo dõi usage (companies/users/assets)
- ✅ Tìm kiếm license
- ✅ Xuất danh sách CSV
- ✅ Làm mới dữ liệu

**Thống kê hiển thị:**
- Key code & trạng thái
- Thông tin khách hàng
- Usage hiện tại vs giới hạn
- Ngày hết hạn
- Lần sử dụng cuối

### **Customer Interface (Settings)**

**Chức năng cho khách hàng:**
- ✅ Kích hoạt license key
- ✅ Xem thông tin license hiện tại
- ✅ Theo dõi usage meters
- ✅ Thông báo hết hạn
- ✅ Thông tin liên hệ gia hạn

## 🔒 Bảo mật & Giới hạn

### **Row Level Security (RLS)**
- ✅ Khách hàng chỉ thấy data công ty của mình
- ✅ Admin thấy tất cả data
- ✅ License usage tự động cập nhật
- ✅ Validation limits khi thêm user/asset

### **Usage Enforcement**
```typescript
// Tự động check limits khi:
- Tạo company mới
- Thêm user vào company
- Tạo asset mới

// Error nếu vượt limit:
"User limit reached! (50/50)"
"Company limit reached! (3/3)"
```

### **License Validation**
- ✅ Check valid date range
- ✅ Check active status
- ✅ Check usage limits
- ✅ Auto-expire sau valid_until

## 📊 Monitoring & Analytics

### **Key Metrics theo dõi:**
1. **Revenue:** Tổng license đã bán
2. **Active licenses:** License đang hoạt động
3. **Usage rates:** % sử dụng trung bình
4. **Expiry alerts:** License sắp hết hạn
5. **Support requests:** Khách hàng cần hỗ trợ

### **SQL Queries hữu ích:**

```sql
-- Doanh thu theo tháng
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as licenses_sold,
  SUM(CASE
    WHEN plan_type = 'basic' THEN 5000000
    WHEN plan_type = 'pro' THEN 12000000
    WHEN plan_type = 'enterprise' THEN 25000000
  END) as revenue
FROM license_keys
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY month
ORDER BY month;

-- License sắp hết hạn (30 ngày)
SELECT key_code, company_name, customer_email, valid_until
FROM license_keys
WHERE valid_until <= CURRENT_DATE + INTERVAL '30 days'
  AND status = 'active'
ORDER BY valid_until;

-- Top usage licenses
SELECT
  key_code,
  company_name,
  (current_users::float / max_users * 100) as user_usage_pct,
  (current_assets::float / max_assets * 100) as asset_usage_pct
FROM license_keys
WHERE status = 'active'
ORDER BY user_usage_pct DESC;
```

## 🚨 Troubleshooting

### **Customer không kích hoạt được:**
1. **Check license key format:** Đúng format INV-YYYY-PLAN-XXXX?
2. **Check expiry date:** License đã hết hạn?
3. **Check company limit:** License đã tạo max companies?
4. **Check database:** RLS policies hoạt động?

### **Usage không update:**
1. **Check triggers:** Database triggers hoạt động?
2. **Check RLS:** User có quyền truy cập company?
3. **Refresh data:** Manual refresh license info

### **Admin không truy cập được:**
1. **Check admin role:** User có role = 'admin'?
2. **Check RLS policy:** Admin policy hoạt động?

## 📈 Scaling & Performance

### **Khi nào cần optimize:**
- \>1000 active licenses
- \>10,000 users
- Query chậm \>2s

### **Optimization strategies:**
1. **Database indexing** cho search fields
2. **Caching** license info ở client
3. **Pagination** cho admin panel
4. **Background jobs** cho usage calculation

## 🔄 Backup & Disaster Recovery

### **Critical data backup:**
```sql
-- Export licenses
COPY license_keys TO '/backup/licenses.csv' CSV HEADER;

-- Export companies
COPY companies TO '/backup/companies.csv' CSV HEADER;
```

### **Recovery process:**
1. Restore database từ Supabase backup
2. Verify RLS policies
3. Test admin access
4. Validate license activation flow

## 📞 Support Process

### **Customer support workflow:**
1. **License issues:** Check admin panel
2. **Usage questions:** Explain limits
3. **Upgrade requests:** Generate new license
4. **Technical issues:** Check logs

### **Common support questions:**
- "Tại sao không add được user?" → Check user limit
- "License hết hạn khi nào?" → Check valid_until
- "Làm sao upgrade?" → Generate new license với plan cao hơn

---

## ✅ Checklist triển khai

- [ ] Chạy database schema
- [ ] Set admin user role
- [ ] Update contact info
- [ ] Test license activation flow
- [ ] Test admin panel
- [ ] Tạo license mẫu
- [ ] Test customer workflow
- [ ] Set up monitoring
- [ ] Prepare support documentation

**🎉 License system sẵn sàng cho production!**
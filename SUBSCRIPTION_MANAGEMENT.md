# 📋 Hướng dẫn Quản lý Subscription System

## 🔐 Admin Dashboard Access

### URL & PWA Installation
- **Admin Dashboard URL**: `https://kkts.vercel.app/admin`
- **Có thể cài đặt PWA riêng** cho mobile/desktop với manifest riêng
- **Bắt buộc đăng nhập** bằng email admin được phê duyệt

### Admin Emails
- `mr.ngoctmn@gmail.com` (Super Admin)
- Thêm admin mới trong `src/hooks/useAdminAccess.ts`

## 📊 Tính năng Quản lý

### 1. License Key Management
- **Tạo license mới** cho khách hàng
- **Xem danh sách** tất cả licenses
- **Theo dõi usage** (companies/users/assets)
- **Export CSV** để báo cáo
- **Refresh data** real-time

### 2. Subscription Plans
```typescript
SUBSCRIPTION_PLANS = {
  basic: {
    max_companies: 1,
    max_users: 10,
    max_assets: 1000,
    price_vnd: 5000000,
    price_display: '5,000,000 VNĐ/năm'
  },
  pro: {
    max_companies: 3,
    max_users: 50,
    max_assets: 5000,
    price_vnd: 12000000,
    price_display: '12,000,000 VNĐ/năm'
  },
  enterprise: {
    max_companies: 10,
    max_users: 200,
    max_assets: 20000,
    price_vnd: 25000000,
    price_display: '25,000,000 VNĐ/năm'
  }
}
```

### 3. Company & User Management
- **Xem danh sách công ty** đã đăng ký
- **Theo dõi users** theo từng công ty
- **Kiểm soát limits** và usage
- **License activity logs**

## 🔄 Workflow Quản lý

### Quy trình cấp License
1. **Khách hàng thanh toán** (chuyển khoản/tiền mặt)
2. **Admin tạo license** trên dashboard:
   - Chọn plan (Basic/Pro/Enterprise)
   - Nhập tên công ty
   - Nhập email khách hàng
   - Chọn thời hạn (months)
3. **Hệ thống generate key**: `INV-2024-BAS-XXXX`
4. **Gửi key cho khách hàng**
5. **Khách hàng activate** trên `/settings`

### Key Format
- **Basic**: `INV-YYYY-BAS-XXXX`
- **Pro**: `INV-YYYY-PRO-XXXX`
- **Enterprise**: `INV-YYYY-ENT-XXXX`

## 📈 Monitoring & Reports

### Dashboard Metrics
- Total active licenses
- Revenue tracking
- Usage statistics per plan
- Expiry alerts
- Company growth

### CSV Export Fields
- License key
- Company name
- Customer email
- Plan type
- Status
- Valid from/until
- Current usage
- Created date

## 💾 Database Structure

### Tables
- `license_keys` - License information & limits
- `companies` - Registered companies
- `company_members` - Users per company
- `license_activity_logs` - Activity tracking

### Key Functions
- `activate_license_key()` - Customer activation
- `get_company_license_info()` - License details
- `is_admin_user()` - Admin access check

## 🎯 Admin Interface Features

### Simplified Layout
- **Mandatory login** - No access without admin email
- **PWA installable** - Separate app experience
- **No main app menus** - Focus only on subscription management
- **Responsive design** - Works on mobile/tablet/desktop

### Navigation Tabs
- **License Keys** - Main management
- **Công ty** - Company overview
- **Người dùng** - User management per company

## 🔧 Technical Implementation

### Admin Access Control
```typescript
// useAdminAccess.ts
const adminEmails = [
  'mr.ngoctmn@gmail.com',
  // Add more admin emails here
];
```

### PWA Configuration
- Separate manifest: `/admin-manifest.json`
- Admin-specific icons: `/admin-icon-*.png`
- Standalone display mode
- Admin theme colors

### Security
- Email-based admin access
- No database-level admin table needed
- Client-side admin check with server validation
- Supabase RLS policies for data protection

---

**📝 Note**: Cập nhật file này mỗi khi có thay đổi về subscription system hoặc admin features.
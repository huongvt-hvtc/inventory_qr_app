# Database Setup cho Admin System

## Tại sao cần setup database?

Ứng dụng cần database schema hoàn chỉnh để hoạt động:

### Core App Tables:
1. **`users`** - Thông tin người dùng (extends auth.users)
2. **`companies`** - Thông tin công ty
3. **`company_members`** - Thành viên trong công ty
4. **`assets`** - Tài sản của công ty

### Admin System Tables:
5. **`admin_users`** - Quản lý admin users
6. **`license_keys`** - License keys và subscription
7. **`license_activity_logs`** - Theo dõi hoạt động license

### Database Features:
8. **RLS Policies** - Bảo mật truy cập dữ liệu
9. **Triggers** - Tự động cập nhật usage stats
10. **Foreign Keys** - Liên kết dữ liệu between tables

## Cách setup

### Bước 1: Truy cập Supabase Dashboard
1. Đi tới [supabase.com](https://supabase.com)
2. Đăng nhập vào project của bạn
3. Chọn **SQL Editor** từ menu bên trái

### Bước 2: Chạy Setup Script
1. Copy toàn bộ nội dung của file `ultra-simple-setup.sql`
2. Paste vào SQL Editor
3. Nhấn **Run** để execute script

> **Lưu ý**: File `ultra-simple-setup.sql` đã được test và hoạt động 100%

### Bước 3: Kiểm tra kết quả
Sau khi chạy xong, bạn sẽ thấy:

✅ **Core App Tables:**
- `users` - User profiles
- `companies` - Company information
- `company_members` - Company memberships
- `assets` - Company assets

✅ **Admin Tables:**
- `admin_users` - Admin users
- `license_keys` - License management
- `license_activity_logs` - Activity tracking

✅ **Demo Data:**
- Admin user: `mr.ngoctmn@gmail.com`
- Demo license: `INV-2025-DEMO-TEST001` (Pro plan, 12M VNĐ)

✅ **Security Features:**
- RLS policies cho tất cả tables
- Admin-only access to license management
- User-based access to company data

## Kiểm tra setup thành công

### 1. Kiểm tra tables
Trong Supabase Dashboard > Table Editor, bạn sẽ thấy:

**Core Tables:**
- `users` (trống, sẽ được populate khi users đăng ký)
- `companies` (trống)
- `company_members` (trống)
- `assets` (trống)

**Admin Tables:**
- `admin_users` (có 1 record: mr.ngoctmn@gmail.com)
- `license_keys` (có 1 demo license)
- `license_activity_logs` (trống)

### 2. Test admin login
1. Truy cập `kkts.vercel.app/admin`
2. Đăng nhập với Google bằng email `mr.ngoctmn@gmail.com`
3. Bạn sẽ thấy admin dashboard với demo license

### 3. Test tạo license mới
1. Trong admin dashboard, nhấn "Tạo License Mới"
2. Điền thông tin và tạo license
3. License mới sẽ xuất hiện trong danh sách

## Troubleshooting

### Lỗi: "relation does not exist"
- Có thể một số tables chưa được tạo
- Chạy lại script hoặc kiểm tra lỗi trong SQL Editor

### Lỗi: "permission denied"
- RLS policies chưa hoạt động đúng
- Kiểm tra email admin đã đúng chưa

### Admin không thể truy cập
- Kiểm tra record trong `admin_users` table
- Đảm bảo email đăng nhập Google đúng với email trong database

## Script Chi tiết

File `ultra-simple-setup.sql` bao gồm:

1. **Table Creation** - Tạo các tables cần thiết
2. **Indexes** - Tối ưu performance
3. **RLS Policies** - Bảo mật truy cập
4. **Triggers** - Tự động cập nhật usage stats
5. **Functions** - Các function tiện ích
6. **Sample Data** - Demo data để test

## Sau khi setup

Admin system sẽ hoạt động đầy đủ với:
- ✅ Quản lý license keys
- ✅ Theo dõi usage stats
- ✅ Bảo mật RLS
- ✅ Admin authentication
- ✅ Auto usage tracking

Giờ bạn có thể truy cập `kkts.vercel.app/admin` và sử dụng admin system!
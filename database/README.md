# Database Setup cho Admin System

## Tại sao cần setup database?

Admin system cần các tables và policies để hoạt động:

1. **`license_keys`** - Lưu trữ thông tin license keys
2. **`license_activity_logs`** - Theo dõi hoạt động license
3. **`admin_users`** - Quản lý admin users
4. **RLS Policies** - Bảo mật truy cập dữ liệu
5. **Triggers** - Tự động cập nhật usage stats

## Cách setup

### Bước 1: Truy cập Supabase Dashboard
1. Đi tới [supabase.com](https://supabase.com)
2. Đăng nhập vào project của bạn
3. Chọn **SQL Editor** từ menu bên trái

### Bước 2: Chạy Setup Script
1. Copy toàn bộ nội dung của file `admin-setup.sql`
2. Paste vào SQL Editor
3. Nhấn **Run** để execute script

### Bước 3: Kiểm tra kết quả
Sau khi chạy xong, bạn sẽ thấy:

✅ **Tables được tạo:**
- `admin_users`
- `license_keys`
- `license_activity_logs`

✅ **Admin user được thêm:**
- Email: `mr.ngoctmn@gmail.com`
- Role: `super_admin`

✅ **Demo license được tạo:**
- Key: `INV-2025-DEMO-TEST001`
- Company: Demo Company
- Plan: Pro (12,000,000 VNĐ)

✅ **RLS Policies hoạt động:**
- Chỉ admin có thể xem/tạo/sửa license keys
- Users chỉ thấy license của công ty mình

## Kiểm tra setup thành công

### 1. Kiểm tra tables
Trong Supabase Dashboard > Table Editor, bạn sẽ thấy:
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

File `admin-setup.sql` bao gồm:

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
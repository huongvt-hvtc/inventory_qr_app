# 📊 Scan History Migration Guide

## Tổng quan

Migration này thêm chức năng **lưu lịch sử quét QR code** vào database, cho phép:
- ✅ Đồng bộ lịch sử kiểm kê cross-device
- ✅ Xem lịch sử từ bất kỳ thiết bị nào
- ✅ Dữ liệu không bị mất khi đổi thiết bị/browser
- ✅ Mỗi user có lịch sử riêng (RLS enabled)

## 🚀 Hướng dẫn cài đặt

### Bước 1: Chạy SQL Migration

1. Mở **Supabase Dashboard**
2. Vào **SQL Editor**
3. Mở file `ADD_SCAN_HISTORY.sql`
4. Copy toàn bộ nội dung và paste vào SQL Editor
5. Nhấn **Run** để thực thi

### Bước 2: Kiểm tra

Sau khi chạy migration, verify các bảng và functions:

```sql
-- Check table exists
SELECT * FROM scan_history LIMIT 1;

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('get_recent_scans', 'add_scan_to_history');

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'scan_history';
```

### Bước 3: Deploy Code

Code đã được cập nhật để tự động sử dụng database. Chỉ cần:

```bash
git pull origin main
pnpm install
pnpm build
```

## 📋 Chi tiết thay đổi

### Database Schema

**Bảng mới: `scan_history`**
- `id`: UUID primary key
- `user_email`: Email của user (dùng cho RLS)
- `asset_id`: UUID reference đến assets table
- `asset_code`: Mã tài sản
- `scanned_at`: Thời gian quét
- `created_at`: Thời gian tạo record

**Functions mới:**
1. `get_recent_scans(user_email, limit)` - Lấy lịch sử quét với đầy đủ thông tin asset
2. `add_scan_to_history(user_email, asset_id)` - Thêm một lần quét vào lịch sử

**RLS Policies:**
- Users chỉ xem được lịch sử của chính họ
- Auto-cleanup: Giữ tối đa 50 records mới nhất per user

### Code Changes

**File mới:**
- `src/lib/scanHistory.ts` - Functions để interact với database

**File đã sửa:**
- `src/contexts/RecentScansContext.tsx` - Thêm sync với database
- `src/app/scanner/page.tsx` - Update async handling
- `src/app/assets/page.tsx` - Update async handling

## 🔍 Testing

### Test 1: Quét QR Code
1. Login vào app
2. Vào tab QR Scanner
3. Quét một QR code
4. Vào tab "Kiểm kê gần đây" → Phải thấy asset vừa quét

### Test 2: Cross-Device Sync
1. Login cùng account trên device khác
2. Mở tab "Kiểm kê gần đây"
3. Phải thấy lịch sử từ device trước

### Test 3: Clear History
1. Vào tab "Kiểm kê gần đây"
2. Click "Xóa lịch sử"
3. Reload page → Lịch sử phải trống

## ⚠️ Lưu ý

1. **Migration an toàn**: Không ảnh hưởng đến dữ liệu hiện có
2. **Backward compatible**: App vẫn chạy được nếu chưa run migration (nhưng không có sync)
3. **Performance**: Indexes đã được tối ưu cho query nhanh
4. **Storage**: Auto-cleanup giữ tối đa 50 scans/user

## 🐛 Troubleshooting

### Lỗi: "relation scan_history does not exist"
→ Chưa chạy migration SQL. Quay lại Bước 1.

### Lỗi: "permission denied for function get_recent_scans"
→ Thiếu GRANT permissions. Re-run SQL migration.

### Lỗi: "RLS policy violation"
→ Check user authentication. User phải đăng nhập.

## 📞 Support

Nếu có vấn đề, check logs:
- Browser console: `F12` → Console
- Supabase logs: Dashboard → Logs → API Logs
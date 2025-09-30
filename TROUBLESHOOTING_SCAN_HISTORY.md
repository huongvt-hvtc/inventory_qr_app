# 🔍 Troubleshooting: Lịch sử Kiểm kê không đồng bộ

## Vấn đề

Sau khi quét QR code hoặc kiểm kê tài sản, dữ liệu không xuất hiện trong tab "Kiểm kê gần đây" hoặc không đồng bộ cross-device.

## Các bước kiểm tra

### Bước 1: Kiểm tra Console Logs

Mở Browser Console (`F12` → Console) và tìm các log sau:

**Khi quét/kiểm kê asset:**
```
➕ Adding scan to history: { userEmail: "...", assetId: "..." }
✅ Scan added to history, ID: <uuid>
```

**Khi load trang:**
```
📊 Fetching recent scans for: user@email.com
✅ Fetched X recent scans
```

### Bước 2: Kiểm tra Database

#### 2.1. Check bảng `scan_history` có tồn tại không

```sql
SELECT * FROM scan_history LIMIT 5;
```

**Nếu lỗi "relation does not exist":**
→ Chưa chạy migration. Run `ADD_SCAN_HISTORY.sql`

#### 2.2. Check functions có tồn tại không

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('get_recent_scans', 'add_scan_to_history');
```

**Kết quả mong đợi:**
```
routine_name          | routine_type
----------------------|-------------
get_recent_scans      | FUNCTION
add_scan_to_history   | FUNCTION
```

**Nếu không có:**
→ Run `ADD_SCAN_HISTORY.sql` hoặc `UPDATE_SCAN_HISTORY_FUNCTION.sql`

#### 2.3. Check có data trong bảng không

```sql
SELECT user_email, asset_code, scanned_at
FROM scan_history
ORDER BY scanned_at DESC
LIMIT 10;
```

**Nếu trống:**
→ Function add_scan_to_history có thể bị lỗi. Check logs.

### Bước 3: Test Functions Manually

#### Test get_recent_scans

```sql
SELECT * FROM get_recent_scans('your-email@example.com', 10);
```

**Nếu lỗi:**
- Check RLS policies
- Check user authentication
- Check function permissions

#### Test add_scan_to_history

```sql
-- Get a valid asset_id first
SELECT id, asset_code FROM assets LIMIT 1;

-- Then add to history
SELECT add_scan_to_history('your-email@example.com', '<asset-id-from-above>');
```

**Nếu lỗi "permission denied":**
```sql
-- Grant permissions
GRANT EXECUTE ON FUNCTION get_recent_scans TO authenticated;
GRANT EXECUTE ON FUNCTION add_scan_to_history TO authenticated;
```

### Bước 4: Check RLS Policies

```sql
SELECT * FROM pg_policies WHERE tablename = 'scan_history';
```

**Phải có 3 policies:**
1. Users can view their own scan history
2. Users can insert their own scan history
3. Users can delete their own scan history

**Nếu thiếu:**
→ Re-run `ADD_SCAN_HISTORY.sql`

### Bước 5: Check User Authentication

```sql
-- Check current user email from JWT
SELECT current_setting('request.jwt.claims', true)::json->>'email';
```

**Nếu null hoặc empty:**
→ User chưa đăng nhập hoặc JWT không hợp lệ

## Common Issues & Solutions

### Issue 1: "Function does not exist"

**Error trong console:**
```
Error fetching recent scans: { code: "42883", message: "function get_recent_scans(...) does not exist" }
```

**Solution:**
```sql
-- Run this in Supabase SQL Editor
\i UPDATE_SCAN_HISTORY_FUNCTION.sql
```

### Issue 2: "Row Level Security policy violation"

**Error trong console:**
```
Error adding scan to history: { code: "42501", message: "new row violates row-level security policy" }
```

**Solution:**
Check user email matches:
```sql
-- This should return your email
SELECT current_setting('request.jwt.claims', true)::json->>'email';

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'scan_history';
```

If no policies, re-run `ADD_SCAN_HISTORY.sql`

### Issue 3: Không có data mặc dù không có error

**Console shows:**
```
✅ Scan added to history, ID: <uuid>
✅ Fetched 0 recent scans
```

**Possible causes:**
1. Data được add với email khác
2. Query function bị lỗi logic

**Check:**
```sql
-- Check all records
SELECT user_email, asset_code, scanned_at
FROM scan_history
ORDER BY scanned_at DESC;

-- If data exists but query returns 0:
-- Update function
\i UPDATE_SCAN_HISTORY_FUNCTION.sql
```

### Issue 4: Nút "Làm mới" không làm gì

**Check console khi click:**
- Không thấy log → Button onclick không hoạt động
- Thấy log nhưng không update UI → Check React state

**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) hoặc `Cmd+Shift+R` (Mac)
2. Clear cache và reload
3. Check network tab để xem API calls

## Testing Checklist

- [ ] Chạy `ADD_SCAN_HISTORY.sql` trong Supabase
- [ ] Chạy `UPDATE_SCAN_HISTORY_FUNCTION.sql` trong Supabase
- [ ] Deploy code mới (git pull)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Login vào app
- [ ] Quét 1 QR code
- [ ] Check console: `✅ Scan added to history`
- [ ] Vào tab "Kiểm kê gần đây"
- [ ] Check console: `✅ Fetched X recent scans`
- [ ] Thấy asset vừa quét
- [ ] Login từ device khác
- [ ] Thấy cùng lịch sử

## Need Help?

Nếu vẫn gặp vấn đề:

1. **Export logs:**
   - Open Console (F12)
   - Right-click → Save as... → `console-logs.txt`

2. **Export database schema:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'scan_history';
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name LIKE '%scan%';
   ```

3. **Check authentication:**
   ```sql
   SELECT current_setting('request.jwt.claims', true)::json->>'email';
   ```

4. Share kết quả để debug tiếp!
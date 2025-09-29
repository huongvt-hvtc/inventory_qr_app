# Database Schema

## 📋 Hướng dẫn Setup Database

### ✅ Chỉ cần 1 file duy nhất

Chạy file `COMPLETE_SCHEMA.sql` trong Supabase SQL Editor là xong!

File này chứa:
- ✅ Tất cả tables cần thiết
- ✅ Functions và triggers
- ✅ Row Level Security policies
- ✅ Sample data

### 🚀 Các bước thực hiện:

1. **Mở Supabase Dashboard**
   - Vào project của bạn
   - Click vào **SQL Editor**

2. **Chạy Schema**
   ```sql
   -- Copy toàn bộ nội dung file COMPLETE_SCHEMA.sql
   -- Paste vào SQL Editor
   -- Click Run
   ```

3. **Set Admin User**
   ```sql
   -- Thay your-email@gmail.com bằng email admin của bạn
   UPDATE users 
   SET role = 'admin' 
   WHERE email = 'your-email@gmail.com';
   ```

4. **Verify Setup**
   ```sql
   -- Check tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Should see: users, assets, licenses, companies, etc.
   ```

### ⚠️ Lưu ý

- Nếu đã có tables cũ, backup trước khi chạy
- Script sẽ tạo mọi thứ từ đầu
- Không cần chạy file nào khác

### ✨ Features của Schema v2.0

- **Email-based License System**: Không cần license key phức tạp
- **Multi-company Support**: Mỗi license có thể tạo nhiều công ty
- **Device Limits**: 1 mobile + 1 desktop per user
- **Auto Usage Tracking**: Triggers tự động update usage
- **RLS Security**: Row Level Security cho tất cả tables

---

**Version**: 2.0
**Last Updated**: 2024
**File**: `COMPLETE_SCHEMA.sql`

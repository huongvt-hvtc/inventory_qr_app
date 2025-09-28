# 📧 Hướng dẫn Setup Gmail SMTP (MIỄN PHÍ 100%)

## 📋 **Bước 1: Tạo App Password cho Gmail**

### 1.1. Bật 2-Factor Authentication:
1. Vào [myaccount.google.com](https://myaccount.google.com)
2. Chọn **Security** → **2-Step Verification**
3. Bật 2-Factor Authentication (bắt buộc)

### 1.2. Tạo App Password:
1. Vào **Security** → **App passwords**
2. Chọn **Select app** → **Mail**
3. Chọn **Select device** → **Other** → Nhập "Inventory QR App"
4. Nhấn **Generate**
5. **Copy password 16 ký tự** (ví dụ: `abcd efgh ijkl mnop`)

## 📋 **Bước 2: Cấu hình Environment Variables**

Thêm vào file `.env.local`:

```env
# Gmail SMTP Configuration (MIỄN PHÍ)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**Thay thế:**
- `your-email@gmail.com` → Email Gmail của bạn
- `abcd efgh ijkl mnop` → App Password vừa tạo

## 📋 **Bước 3: Test Email**

1. Restart server: `pnpm dev`
2. Vào Settings → Quản lý Nhóm Người Dùng
3. Mời 1 email test
4. Kiểm tra inbox

## 🔄 **Giới hạn Gmail SMTP:**

- ✅ **500 emails/ngày** (quá đủ cho app)
- ✅ **Hoàn toàn miễn phí**
- ✅ **Reliability cao**

## ⚠️ **Troubleshooting:**

**Lỗi "Invalid credentials":**
- Kiểm tra GMAIL_USER đúng format
- Kiểm tra GMAIL_APP_PASSWORD không có dấu cách
- Đảm bảo 2FA đã bật

**Email không gửi được:**
- Kiểm tra .env.local đã restart server
- Kiểm tra console.log lỗi trong Network tab

## 🎯 **Sau khi setup xong:**

Email mời sẽ có:
- ✅ HTML template đẹp
- ✅ Thông tin license chi tiết
- ✅ Link chấp nhận lời mời
- ✅ Hướng dẫn tham gia

**Hoàn toàn miễn phí và professional!** 🚀
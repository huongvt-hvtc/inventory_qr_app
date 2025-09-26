# 📸 Hướng dẫn cấp quyền Camera cho PWA

## 🎯 Tổng quan
Ứng dụng Kiểm kê tài sản cần quyền truy cập camera để quét mã QR. Hệ thống đã được tối ưu để:
- ✅ Kiểm tra quyền camera trước khi khởi động scanner
- ✅ Hiển thị UI rõ ràng cho từng trạng thái quyền
- ✅ Cung cấp hướng dẫn chi tiết cho từng platform
- ✅ Luôn có phương án nhập mã thủ công làm backup

## 📱 Hướng dẫn theo thiết bị

### iPhone/iPad (iOS Safari)

#### Khi dùng trên Safari:
1. **Lần đầu truy cập:**
   - Khi nhấn "Bắt đầu quét", Safari sẽ hỏi quyền camera
   - Chọn **"Cho phép"** (Allow)

2. **Nếu đã từ chối trước đó:**
   - Vào **Cài đặt** > **Safari**
   - Chọn **Camera** > **Cho phép**
   - Quay lại Safari và tải lại trang

#### Khi cài PWA (Add to Home Screen):
1. **Cài đặt PWA:**
   - Mở Safari và truy cập ứng dụng
   - Nhấn nút chia sẻ (Share) ⬆️
   - Chọn **"Add to Home Screen"**
   - Đặt tên và nhấn **"Add"**

2. **Cấp quyền camera cho PWA:**
   - Mở app từ màn hình chính
   - Khi nhấn "Bắt đầu quét", iOS sẽ hỏi quyền
   - Chọn **"OK"** hoặc **"Cho phép"**

3. **Nếu PWA không thể xin quyền:**
   - Quay lại Safari
   - Truy cập lại trang web
   - Cấp quyền camera trong Safari
   - Xóa PWA cũ và cài lại từ Safari

### Android (Chrome/Edge)

#### Trên trình duyệt:
1. **Lần đầu:**
   - Nhấn "Bắt đầu quét"
   - Chọn **"Allow"** khi được hỏi

2. **Nếu đã từ chối:**
   - Nhấn vào biểu tượng 🔒 hoặc ℹ️ trên thanh địa chỉ
   - Tìm **"Camera"** trong Site settings
   - Chọn **"Allow"**
   - Tải lại trang (F5)

#### PWA trên Android:
1. **Cài PWA:**
   - Chrome sẽ tự động hiện banner "Add to Home Screen"
   - Hoặc: Menu 3 chấm > **"Install app"**

2. **Quyền camera:**
   - PWA sẽ kế thừa quyền từ Chrome
   - Nếu cần, vào **Settings** > **Apps** > **[Tên app]** > **Permissions**

### Desktop (Windows/Mac/Linux)

#### Chrome/Edge/Brave:
1. **Cấp quyền:**
   - Nhấn "Bắt đầu quét"
   - Chọn **"Allow"** trong popup

2. **Quản lý quyền:**
   - Click vào 🔒 bên trái URL
   - Tìm **Camera** > chọn **"Allow"**

#### Firefox:
1. **Cấp quyền:**
   - Nhấn "Bắt đầu quét"
   - Chọn camera và nhấn **"Allow"**

2. **Reset quyền:**
   - Click vào 🔒 > **"Clear permissions"**
   - Tải lại và cấp quyền lại

## 🔧 Xử lý sự cố

### Camera không hoạt động
1. **Kiểm tra quyền hệ thống:**
   - **Windows:** Settings > Privacy > Camera
   - **macOS:** System Preferences > Security & Privacy > Camera
   - **Linux:** Kiểm tra quyền trong system settings

2. **Kiểm tra trình duyệt:**
   - Đảm bảo trình duyệt được cập nhật
   - Thử với trình duyệt khác
   - Xóa cache và cookies

### PWA không thể quét QR
1. **iOS:**
   - Xóa app từ Home Screen
   - Mở Safari, xóa cache
   - Cài lại PWA

2. **Android:**
   - Clear app data
   - Uninstall và reinstall PWA

### Lỗi "Camera bị chặn"
- Kiểm tra xem có phần mềm antivirus/firewall chặn camera không
- Đảm bảo không có ứng dụng khác đang dùng camera
- Restart thiết bị nếu cần

## 💡 Mẹo sử dụng

### Quét QR hiệu quả:
- **Khoảng cách:** 20-30cm từ camera đến QR code
- **Ánh sáng:** Đảm bảo đủ sáng, tránh chói
- **Góc quét:** Giữ camera thẳng góc với QR code
- **Độ nét:** Chờ camera lấy nét tự động

### Backup - Nhập mã thủ công:
- Luôn có thể nhập mã tài sản thủ công nếu không quét được
- Hỗ trợ tìm kiếm theo: mã tài sản, tên, serial, tech code

## 📊 Trạng thái quyền trong app

App sẽ hiển thị rõ trạng thái:

1. **🔄 Đang kiểm tra...** - Đang kiểm tra quyền camera
2. **💙 Cần quyền camera** - Chưa cấp quyền, sẵn sàng xin quyền
3. **✅ Sẵn sàng quét** - Đã có quyền, có thể bắt đầu
4. **🔴 Camera bị chặn** - Quyền bị từ chối, cần cấu hình lại

## 🚀 Triển khai thành công

Hệ thống đã được cải thiện với:
- ✅ Kiểm tra quyền trước khi khởi động scanner
- ✅ UI/UX rõ ràng cho từng trạng thái
- ✅ Hướng dẫn platform-specific
- ✅ Fallback nhập thủ công luôn khả dụng
- ✅ Xử lý edge cases (PWA iOS, permission denied, etc.)

## 📝 Test Checklist

- [ ] Test trên iOS Safari
- [ ] Test PWA trên iOS
- [ ] Test trên Android Chrome
- [ ] Test PWA trên Android
- [ ] Test trên Desktop (Chrome, Firefox, Edge)
- [ ] Test từ chối quyền và cấp lại
- [ ] Test nhập mã thủ công
- [ ] Test offline mode
- [ ] Test với nhiều loại QR code khác nhau
- [ ] Test trong điều kiện ánh sáng khác nhau

---

*Cập nhật: Tháng 1/2025 - Version 2.0 với luồng xin quyền được cải thiện*

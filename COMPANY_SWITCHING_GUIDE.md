# 🏢 Hướng dẫn Quản lý và Chuyển đổi Danh sách Tài sản

## 📋 **Flow hoàn chỉnh từ tạo đến sử dụng:**

### **1. Chủ Gmail tạo danh sách tài sản (Company)**

**Bước 1:** Vào **Settings** → **Quản lý Công ty**
- Nhấn **"Tạo công ty mới"**
- Nhập tên công ty (ví dụ: "Kho Hà Nội", "Chi nhánh HCM")
- Nhấn **"Tạo"**

**Bước 2:** Mời thành viên (nếu cần)
- Vào **Settings** → **Quản lý Nhóm Người Dùng**
- Nhập email thành viên
- Nhấn **"Mời"** → Email được gửi tự động

**Bước 3:** Phân quyền thành viên cho từng công ty
- Vào **Settings** → **Quản lý Danh sách Tài sản & Phân quyền**
- Chọn từng thành viên, cấp quyền:
  - **Quản trị:** Xem, thêm, sửa, xóa tài sản
  - **Thành viên:** Xem và thêm tài sản
  - **Xem:** Chỉ xem danh sách

### **2. Truy cập và Sử dụng App**

**Sau khi có công ty, user có thể:**

#### **A. Chuyển đổi giữa các công ty:**
- Ở **header của app**, nhấn vào dropdown **công ty hiện tại**
- Chọn công ty khác từ danh sách
- App sẽ load dữ liệu tài sản của công ty đó

#### **B. Các trang chính sẽ hiện theo công ty được chọn:**
- **📦 Tài sản:** Danh sách tài sản của công ty đang chọn
- **📱 Scanner:** Scan QR code tài sản trong công ty
- **📊 Recent Inventory:** Lịch sử kiểm kê của công ty
- **⚙️ Settings:** Quản lý toàn bộ license và công ty

### **3. Các trường hợp sử dụng:**

#### **Trường hợp 1: Chủ sở hữu license**
- Thấy **TẤT CẢ** công ty trong license
- Có thể tạo/sửa/xóa công ty
- Có thể mời/xóa thành viên
- Có thể phân quyền cho từng công ty

#### **Trường hợp 2: Thành viên được mời**
- Chỉ thấy **công ty được phân quyền**
- Không thể tạo/xóa công ty
- Không thể mời thành viên mới
- Chỉ làm việc theo quyền được cấp

### **4. Company Switcher Interface:**

```
┌─────────────────────────────────────┐
│ 🏢 [Kho Hà Nội] ▼                  │  ← Dropdown chuyển công ty
├─────────────────────────────────────┤
│ ✓ Kho Hà Nội                       │  ← Công ty đang chọn
│   Chi nhánh HCM                    │  ← Công ty khác
│   Văn phòng Đà Nẵng                │
├─────────────────────────────────────┤
│ ⚙️ Quản lý công ty                  │  ← Link đến Settings
└─────────────────────────────────────┘
```

### **5. Workflow thực tế:**

**Ví dụ công ty có 3 kho:**

1. **Admin tạo 3 công ty:**
   - "Kho Hà Nội"
   - "Kho HCM"
   - "Kho Đà Nẵng"

2. **Mời nhân viên:**
   - `nhanvien.hn@company.com` → Quyền "Thành viên" tại "Kho Hà Nội"
   - `nhanvien.hcm@company.com` → Quyền "Quản trị" tại "Kho HCM"
   - `manager@company.com` → Quyền "Quản trị" tại cả 3 kho

3. **Nhân viên sử dụng:**
   - Login → Thấy dropdown công ty they có quyền
   - Chọn kho → Làm việc với tài sản của kho đó
   - Switch kho khác → Dữ liệu thay đổi theo kho

### **6. Tính năng đặc biệt:**

#### **Smart Context Switching:**
- Mỗi khi chuyển công ty, toàn bộ app reload dữ liệu
- Assets, scanning, inventory đều theo công ty được chọn
- Settings luôn show toàn bộ license info

#### **Responsive Design:**
- Mobile: Company switcher ở header
- Desktop: Dropdown đẹp với search
- Offline: Cache company list local

## 🎯 **Kết quả:**

✅ **Chủ license:** Quản lý multiple companies dễ dàng
✅ **Thành viên:** Chỉ thấy companies được phép
✅ **Switch nhanh:** 1 click chuyển đổi context
✅ **Permission-based:** Mỗi người quyền khác nhau
✅ **Real-time sync:** Dữ liệu luôn đúng theo company

**Hoàn toàn ready để sử dụng production!** 🚀
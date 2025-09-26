# 📱 Hướng dẫn cấp quyền Camera cho iOS PWA

## Vấn đề với iOS PWA

iOS Safari có hạn chế với PWA (Progressive Web App) khi được thêm vào màn hình chính:
- PWA chạy trong sandbox riêng
- Không thể lưu permission vĩnh viễn
- Cần cấp quyền mỗi lần sử dụng

## ✅ Giải pháp đã implement

### 1. **Request Permission Trực tiếp**
```javascript
// Click button → Request camera → Start scanner
const stream = await navigator.mediaDevices.getUserMedia({ 
  video: { facingMode: 'environment' }
})
```

### 2. **Detect PWA Mode**
```javascript
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
              window.navigator.standalone === true
```

### 3. **UX Improvements**
- Single button để request permission + start scanner
- Clear instructions cho user
- Fallback instructions nếu không cấp được quyền

## 📱 Cách sử dụng trên iOS

### Lần đầu sử dụng:

1. **Mở trong Safari** (không phải PWA)
   - Vào: https://your-domain.com/scanner
   - Khi Safari hỏi → Chọn "Allow"
   - Test quét QR

2. **Thêm vào màn hình chính**
   - Tap Share button
   - Chọn "Add to Home Screen"
   - Đặt tên app

3. **Mở PWA từ Home Screen**
   - Tap icon app
   - Nhấn "Bắt đầu quét"
   - Cho phép camera khi được hỏi

### Nếu không thể cấp quyền trong PWA:

**Option 1: Use Safari**
- Dùng trực tiếp trong Safari
- Camera permission ổn định hơn

**Option 2: Reset và thêm lại**
1. Xóa PWA khỏi Home Screen
2. Mở lại trong Safari
3. Clear cache: Settings → Safari → Clear History
4. Cho phép camera trong Safari
5. Add to Home Screen lại

## 🔧 Code Implementation

### MobileScanner.tsx Updates:

```typescript
// 1. Direct permission request
const requestPermissionAndStart = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' }
    })
    stream.getTracks().forEach(track => track.stop())
    
    // Permission granted → Start scanner
    await initScanner()
  } catch (error) {
    // Handle permission denied
  }
}

// 2. Better error handling
if (error.name === 'NotAllowedError') {
  if (isPWA()) {
    // Show PWA-specific instructions
  } else {
    // Show browser instructions
  }
}

// 3. Single button flow
<Button onClick={requestPermissionAndStart}>
  Cấp quyền & Bắt đầu quét
</Button>
```

## 🎯 Best Practices

### Do's:
- ✅ Request permission on user action (button click)
- ✅ Show clear instructions
- ✅ Handle errors gracefully
- ✅ Provide fallback options

### Don'ts:
- ❌ Auto-request permission on load
- ❌ Multiple permission requests
- ❌ Confusing error messages

## 📊 Testing Checklist

### iOS Safari (Direct):
- [ ] Camera permission prompt appears
- [ ] Scanner works after allowing
- [ ] Permission persists in same session

### iOS PWA:
- [ ] App opens from Home Screen
- [ ] Button triggers permission request
- [ ] Scanner starts after permission
- [ ] Error message if denied
- [ ] Instructions shown for troubleshooting

### Android:
- [ ] Works in Chrome
- [ ] Works as PWA
- [ ] Permission persists

## 🚀 Deployment Notes

### Server Headers:
```nginx
# Required for camera access
add_header Permissions-Policy "camera=(self)";

# PWA headers
add_header Service-Worker-Allowed "/";
```

### HTTPS Required:
- Camera API only works on HTTPS
- Exception: localhost for development

## 💡 Alternative Solutions

### 1. **Native App**
- Build with Capacitor/React Native
- Full camera control
- Better permission handling

### 2. **Hybrid Approach**
- PWA for most features
- Native app for scanning

### 3. **Manual Input Fallback**
- Always provide manual code input
- QR scanning as enhancement

## 🐛 Known Issues

### iOS < 14.5:
- MediaDevices API limited
- May need iOS update

### iOS 15+:
- Better PWA support
- More stable permissions

### Safari Settings:
- Check: Settings → Safari → Camera
- Ensure website has permission

## 📝 User Instructions Card

Đã thêm vào UI:

```jsx
{isPWA() && (
  <div className="p-3 bg-blue-50 rounded-lg">
    <p className="text-xs font-medium mb-2">
      Nếu không thể cấp quyền:
    </p>
    <ol className="text-xs space-y-1">
      <li>1. Mở Safari và vào trang web này</li>
      <li>2. Cho phép camera khi được hỏi</li>
      <li>3. Thêm lại vào màn hình chính</li>
    </ol>
  </div>
)}
```

## ✅ Summary

Giải pháp hiện tại:
1. **Single button** để request permission + start
2. **Clear instructions** cho PWA users
3. **Fallback options** nếu permission fail
4. **Manual input** luôn available

Điều này đảm bảo app vẫn sử dụng được ngay cả khi có vấn đề với camera permissions trên iOS PWA.

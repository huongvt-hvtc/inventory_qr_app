# QR Scanner Components Documentation

## Tổng quan

Dự án có 3 phiên bản scanner được tối ưu cho các trường hợp sử dụng khác nhau:

### 1. OptimizedScanner (`/components/scanner/OptimizedScanner.tsx`)
**Phiên bản được khuyên dùng cho production**

#### Tính năng chính:
- ✅ Tự động kiểm tra và yêu cầu quyền camera
- ✅ Responsive design cho mobile và desktop
- ✅ Animation feedback khi quét thành công
- ✅ Throttling để tránh quét trùng lặp (2 giây)
- ✅ Haptic feedback trên mobile
- ✅ Hỗ trợ nhiều format: QR Code, Data Matrix, Code 128, Code 39
- ✅ Tự động pause/resume sau khi quét
- ✅ Visual feedback với animation scan line
- ✅ Error recovery và retry logic

#### Cách sử dụng:
```tsx
import OptimizedScanner from '@/components/scanner/OptimizedScanner'

<OptimizedScanner
  onScanSuccess={(code) => {
    console.log('Scanned:', code)
  }}
  onScanError={(error) => {
    console.error('Error:', error)
  }}
/>
```

### 2. ProScanner (`/components/scanner/ProScanner.tsx`)
**Phiên bản nâng cao với nhiều tính năng**

#### Tính năng bổ sung:
- 📊 Dashboard thống kê: tổng quét, tỷ lệ thành công, thời gian trung bình
- 📝 Lịch sử quét gần đây
- ⌨️ Nhập mã thủ công tích hợp
- ⚙️ Cài đặt nhanh (FPS, kích thước viewfinder)
- 🎯 Hiển thị mã vừa quét
- 📱 Tối ưu cho cả mobile và desktop

#### Khi nào nên dùng:
- Cần theo dõi thống kê quét
- Người dùng cần nhập mã thủ công
- Cần xem lịch sử các lần quét gần đây

### 3. SimpleScanner (`/components/scanner/SimpleScanner.tsx`)
**Phiên bản cơ bản, gọn nhẹ**

#### Tính năng:
- Chức năng quét cơ bản
- UI tối giản
- Phù hợp cho embedded hoặc modal

## Cấu hình Scanner

### Tối ưu cho Mobile:
```javascript
const config = {
  fps: 10, // Giảm FPS để tiết kiệm pin
  aspectRatio: 1.0, // Vuông cho mobile
  qrbox: 200 // Kích thước nhỏ hơn
}
```

### Tối ưu cho Desktop:
```javascript
const config = {
  fps: 15, // FPS cao hơn
  aspectRatio: 1.777, // 16:9 cho desktop
  qrbox: 250 // Kích thước lớn hơn
}
```

## Xử lý lỗi thường gặp

### 1. Camera không hoạt động
**Nguyên nhân:**
- Không có HTTPS (cần HTTPS hoặc localhost)
- Quyền camera bị từ chối
- Camera đang được app khác sử dụng

**Giải pháp:**
```javascript
// Check HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  alert('Cần HTTPS để sử dụng camera')
}

// Request permission explicitly
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    stream.getTracks().forEach(track => track.stop())
    // Permission granted
  })
  .catch(err => {
    // Permission denied
  })
```

### 2. Quét chậm hoặc không nhận diện

**Tối ưu:**
- Tăng độ sáng màn hình
- Điều chỉnh khoảng cách (15-30cm)
- Sử dụng camera sau (environment) thay vì camera trước
- Giảm FPS nếu thiết bị yếu

### 3. Quét bị trùng lặp

**Giải pháp:** Sử dụng throttling
```javascript
const SCAN_COOLDOWN = 2000 // 2 seconds

if (lastScanCode === code && Date.now() - lastScanTime < SCAN_COOLDOWN) {
  return // Ignore duplicate
}
```

## Performance Tips

### 1. Lazy Loading
```javascript
const OptimizedScanner = dynamic(
  () => import('@/components/scanner/OptimizedScanner'),
  { 
    ssr: false,
    loading: () => <div>Loading scanner...</div>
  }
)
```

### 2. Cleanup
```javascript
useEffect(() => {
  return () => {
    // Always cleanup scanner on unmount
    if (scannerRef.current) {
      scannerRef.current.clear()
    }
  }
}, [])
```

### 3. Memory Management
- Stop scanner khi không sử dụng
- Clear references khi component unmount
- Limit recent scans history (max 10 items)

## Testing Checklist

### Desktop (Chrome/Firefox/Safari):
- [ ] Camera permission request works
- [ ] Scanner starts/stops properly
- [ ] QR codes scan successfully
- [ ] Multiple camera selection works
- [ ] Torch/flash toggle works (if available)

### Mobile (iOS Safari/Chrome):
- [ ] Camera permission on iOS
- [ ] Rear camera selected by default
- [ ] Haptic feedback on scan
- [ ] Responsive layout
- [ ] Touch-friendly buttons

### PWA Mode:
- [ ] Scanner works in standalone mode
- [ ] Camera permission persists
- [ ] Offline detection

## Troubleshooting Commands

```bash
# Check if running on HTTPS
console.log(location.protocol)

# List available cameras
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    devices.filter(d => d.kind === 'videoinput')
      .forEach(camera => console.log(camera.label, camera.deviceId))
  })

# Test camera access
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('Camera OK')
    stream.getTracks().forEach(t => t.stop())
  })
  .catch(err => console.error('Camera Error:', err))
```

## Browser Compatibility

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ 80+ | ✅ 80+ | Full support |
| Firefox | ✅ 75+ | ✅ 75+ | Full support |
| Safari | ✅ 14+ | ✅ 14+ | Need user interaction |
| Edge | ✅ 80+ | ✅ 80+ | Full support |
| Opera | ✅ 67+ | ✅ 67+ | Full support |

## Performance Metrics

Target performance với OptimizedScanner:
- Time to first scan: < 3s
- Scan recognition time: < 500ms
- Memory usage: < 50MB
- CPU usage: < 30%
- Battery drain: Minimal

## Support

Nếu gặp vấn đề:
1. Kiểm tra console log
2. Verify HTTPS/localhost
3. Clear browser cache
4. Try different browser
5. Check camera permissions in browser settings

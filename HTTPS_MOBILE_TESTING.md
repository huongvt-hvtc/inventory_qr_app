# HTTPS Mobile Testing Setup

## Setup HTTPS cho mobile testing

### Cách 1: Sử dụng HTTPS server (Recommended)

1. **Chạy HTTPS development server:**
   ```bash
   pnpm run dev:https
   ```

2. **Truy cập trên desktop:**
   - https://localhost:3001
   - Accept certificate warning (click "Advanced" -> "Proceed to localhost")

3. **Truy cập trên mobile:**
   - https://192.168.31.22:3001 (hoặc IP local của bạn)
   - Accept certificate warning trên mobile browser
   - Camera sẽ work normally

### Cách 2: Sử dụng ngrok (Alternative)

1. **Install ngrok:**
   ```bash
   brew install ngrok
   # hoặc download từ https://ngrok.com
   ```

2. **Chạy app local:**
   ```bash
   pnpm dev
   ```

3. **Tạo tunnel:**
   ```bash
   ngrok http 3001
   ```

4. **Sử dụng HTTPS URL từ ngrok trên mobile**

### Cách 3: Chrome DevTools Remote Debugging

1. **Kết nối phone với USB**
2. **Enable Developer Options và USB Debugging trên Android**
3. **Mở Chrome -> More Tools -> Remote devices**
4. **Port forward 3001 -> localhost:3001**
5. **Truy cập localhost:3001 trên mobile Chrome**

## Lưu ý bảo mật

- Self-signed certificate sẽ có warning, nhưng OK cho development
- Camera API chỉ work với HTTPS hoặc localhost
- Production deployment cần SSL certificate thật

## Troubleshooting

- **"Not secure" warning:** Accept certificate để test
- **Camera vẫn không work:** Kiểm tra browser permissions
- **Connection refused:** Đảm bảo cùng network và firewall không block
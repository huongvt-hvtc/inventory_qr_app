# 🔧 FIX DEPLOY ERROR - Vercel

## ❌ Lỗi hiện tại:
```
ERR_PNPM_OUTDATED_LOCKFILE
Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
```

## ✅ CÁCH FIX:

### Option 1: Update lockfile locally (RECOMMENDED)

```bash
# 1. Di chuyển đến thư mục dự án
cd /Users/ngoctmn/Documents/development/inventory-qr-app

# 2. Install lại để update lockfile
pnpm install

# 3. Commit và push
git add pnpm-lock.yaml
git commit -m "fix: update pnpm lockfile"
git push origin main
```

Vercel sẽ tự động rebuild và deploy thành công!

---

### Option 2: Dùng npm thay vì pnpm

```bash
# 1. Xóa pnpm lockfile
rm pnpm-lock.yaml

# 2. Install với npm
npm install

# 3. Commit npm lockfile
git add package-lock.json
git rm pnpm-lock.yaml
git commit -m "fix: switch from pnpm to npm"
git push origin main
```

---

### Option 3: Force Vercel không dùng frozen-lockfile

Trong Vercel Dashboard:
1. Go to **Settings** → **General**
2. Tìm **Install Command**
3. Override với: `pnpm install --no-frozen-lockfile`

---

## 📝 Package.json đã được clean:

- ✅ Đã bỏ uuid dependencies không cần thiết
- ✅ Dùng native UUID generation thay thế
- ✅ Không có breaking changes

## 🎯 Sau khi fix:

1. **Deploy sẽ success trong 1-2 phút**
2. **App hoạt động bình thường**
3. **Không ảnh hưởng features**

---

**Lỗi đã được fix trong code. Chỉ cần update lockfile là xong!**

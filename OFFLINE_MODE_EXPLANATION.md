# 📴 Offline Mode - Giải thích và Giới hạn

## ❓ Tại sao Offline Mode không hoạt động?

App hiện tại **yêu cầu kết nối internet** để hoạt động vì tất cả operations đều cần Supabase database.

## 🏗️ Kiến trúc hiện tại

```
User Action → Frontend → Supabase (Cloud) → Database
     ❌ No internet = No operation
```

**Ví dụ:**
```typescript
// Tạo asset mới - Requires internet
await supabase.from('assets').insert(newAsset);

// Update asset - Requires internet
await supabase.from('assets').update(data).eq('id', id);

// Check asset - Requires internet
await supabase.from('inventory_records').insert(record);
```

## 🚫 Giới hạn khi Offline

Khi không có internet, các thao tác sau **KHÔNG** hoạt động:

### ❌ Không thể làm:
1. **Tạo tài sản mới** → Cần insert vào database
2. **Edit tài sản** → Cần update database
3. **Xóa tài sản** → Cần delete từ database
4. **Kiểm kê tài sản** → Cần insert vào inventory_records
5. **Bỏ kiểm kê** → Cần delete từ inventory_records
6. **Load danh sách tài sản** → Cần fetch từ database
7. **Sync scan history** → Cần fetch/insert database

### ✅ Có thể làm (nhờ PWA cache):
- View trang đã load trước đó (static content)
- Xem UI elements (nhưng không có data mới)
- App vẫn mở được (nhưng không có functionality)

## 💡 Giải pháp: Implement Offline-First Architecture

Để support offline mode, cần implement:

### 1. **Local Storage / IndexedDB**
```typescript
// Store data locally
const db = new Dexie('InventoryDB');
db.version(1).stores({
  assets: '++id, asset_code, name, department',
  inventory_records: '++id, asset_id, checked_at',
  pending_syncs: '++id, type, data, timestamp'
});
```

### 2. **Queue System cho Offline Operations**
```typescript
// When offline, queue operations
const queueOperation = (type, data) => {
  db.pending_syncs.add({
    type, // 'create', 'update', 'delete', 'check'
    data,
    timestamp: Date.now(),
    synced: false
  });
};
```

### 3. **Sync khi Online trở lại**
```typescript
window.addEventListener('online', async () => {
  // Get all pending operations
  const pending = await db.pending_syncs
    .where('synced').equals(false)
    .toArray();

  // Sync each operation
  for (const op of pending) {
    try {
      await syncOperation(op);
      await db.pending_syncs.update(op.id, { synced: true });
    } catch (error) {
      // Handle conflict resolution
    }
  }
});
```

### 4. **Conflict Resolution**
```typescript
// When syncing, check for conflicts
const resolveConflict = (local, remote) => {
  // Strategy 1: Last-write-wins
  if (local.updated_at > remote.updated_at) {
    return local;
  }
  return remote;

  // Strategy 2: Manual resolution
  // Show UI to let user choose
};
```

## 📊 Implementation Complexity

| Feature | Effort | Priority |
|---------|--------|----------|
| Local storage setup | Medium | High |
| Queue system | Medium | High |
| Sync mechanism | High | High |
| Conflict resolution | Very High | Medium |
| Testing | High | Critical |

**Estimated time:** 2-3 weeks for full implementation

## 🎯 Recommended Approach

### Phase 1: Read-only Offline (1 week)
- Cache assets data locally
- Allow viewing cached data offline
- Show "Offline - Read only" banner
- **User can:** View assets, search cached data
- **User cannot:** Create/edit/delete/check

### Phase 2: Queue Writes (1 week)
- Queue create/edit/delete operations
- Auto-sync when back online
- Show pending operations count
- **User can:** All operations (queued)
- **Limitation:** No real-time sync

### Phase 3: Full Offline-First (1 week)
- Bidirectional sync
- Conflict resolution
- Optimistic updates
- **User can:** Everything, seamlessly

## 🔧 Quick Fix: Better Offline UX

Without full offline support, improve UX:

### 1. Detect Offline State
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### 2. Show Offline Banner
```tsx
{!isOnline && (
  <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white p-2 text-center z-50">
    ⚠️ Không có kết nối mạng - Một số chức năng bị tắt
  </div>
)}
```

### 3. Disable Actions
```tsx
<button
  disabled={!isOnline}
  onClick={createAsset}
  className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
>
  {!isOnline ? '📴 Cần internet' : 'Tạo tài sản'}
</button>
```

### 4. Cache Last Loaded Data
```typescript
// Save to localStorage when online
useEffect(() => {
  if (isOnline && assets.length > 0) {
    localStorage.setItem('cached_assets', JSON.stringify(assets));
  }
}, [assets, isOnline]);

// Load from cache when offline
useEffect(() => {
  if (!isOnline) {
    const cached = localStorage.getItem('cached_assets');
    if (cached) {
      setAssets(JSON.parse(cached));
      toast.info('Đang hiển thị dữ liệu đã lưu');
    }
  }
}, [isOnline]);
```

## 📱 Current WiFi Indicator

App đã có `WiFiIndicator` component:
- ✅ Shows online/offline status
- ✅ Visual indicator (green/red)
- ❌ Does NOT prevent operations when offline
- ❌ Operations will just fail silently or show error

## 🚀 Next Steps

**Option 1: Accept limitation (No offline)**
- Document that app requires internet
- Show clear error messages
- Guide users to check connection

**Option 2: Quick UX improvements (1-2 days)**
- Add offline banner
- Disable buttons when offline
- Show cached data with warning
- Add "Retry" button for failed operations

**Option 3: Full offline mode (2-3 weeks)**
- Implement IndexedDB storage
- Build sync queue
- Add conflict resolution
- Extensive testing

## 💬 Recommendation

For this app, **Option 2** is best:
- Low effort, high UX impact
- Users understand limitations
- Clear feedback when offline
- Graceful degradation

Users can still:
- See the limitation clearly
- View cached data
- Retry when back online
- Not get confused by silent failures

## 📖 Resources

- [Offline First Architecture](https://offlinefirst.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker Sync](https://developers.google.com/web/tools/workbox/modules/workbox-background-sync)
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
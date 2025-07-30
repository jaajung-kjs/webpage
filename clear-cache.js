/**
 * 브라우저 캐시 완전 초기화 스크립트
 * 개발 중 ChunkLoadError 해결용
 */

// 1. localStorage 완전 초기화
console.log('Clearing localStorage...');
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));
console.log(`Removed ${keysToRemove.length} localStorage items`);

// 2. sessionStorage 초기화
console.log('Clearing sessionStorage...');
sessionStorage.clear();

// 3. Service Worker 등록 해제
if ('serviceWorker' in navigator) {
  console.log('Unregistering service workers...');
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('Unregistered:', registration.scope);
    });
  });
}

// 4. 캐시 스토리지 삭제
if ('caches' in window) {
  console.log('Clearing cache storage...');
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log('Deleted cache:', name);
    });
  });
}

// 5. IndexedDB 정리 (Next.js가 사용할 수 있음)
if ('indexedDB' in window) {
  console.log('Checking IndexedDB...');
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name && db.name.includes('next')) {
        indexedDB.deleteDatabase(db.name);
        console.log('Deleted IndexedDB:', db.name);
      }
    });
  });
}

console.log('✅ Cache clearing complete. Please refresh the page.');
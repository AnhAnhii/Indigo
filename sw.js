
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Lắng nghe sự kiện Push từ Server (Web Push API - Future proof)
self.addEventListener('push', (event) => {
  let data = 'Bạn có thông báo mới';
  let title = 'Indigo Restaurant';
  
  if (event.data) {
    try {
        const json = event.data.json();
        title = json.title || title;
        data = json.body || json.text || event.data.text();
    } catch (e) {
        data = event.data.text();
    }
  }

  const options = {
    body: data,
    icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
    vibrate: [100, 50, 100],
    data: { url: '/' },
    tag: 'push-' + Date.now(), // Unique tag to ensure banner shows
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 2. Lắng nghe lệnh từ Main Thread (Client gửi xuống để hiển thị thông báo)
// FIX: Đảm bảo hiển thị banner trên iOS/Android ngay cả khi app đang mở
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'Thông báo hệ thống';
    const body = event.data.body || '';
    
    const options = {
      body: body,
      icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
      vibrate: [200, 100, 200],
      data: { url: '/' },
      tag: 'msg-' + Date.now(), // Bắt buộc unique để hiện banner mới
      renotify: true,           // Bắt buộc rung/chuông lại
      requireInteraction: true  // Giữ thông báo không tự tắt (trên Desktop/Android)
    };

    const promise = self.registration.showNotification(title, options);
    if (event.waitUntil) {
        event.waitUntil(promise);
    }
  }
});

// 3. Xử lý khi click vào thông báo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu có tab đang mở, focus vào nó
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Nếu không, mở tab mới
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

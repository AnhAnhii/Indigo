
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // QUAN TRỌNG: Chiếm quyền kiểm soát tất cả các tab đang mở ngay lập tức
  event.waitUntil(self.clients.claim());
});

// 1. Lắng nghe sự kiện Push từ Server (Web Push API - Dự phòng)
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
    vibrate: [200, 100, 200],
    data: { url: '/' },
    tag: 'push-' + Date.now(), // Tag động để không bị ghi đè
    renotify: true, // Bắt buộc rung/chuông lại
    requireInteraction: true // Giữ thông báo trên màn hình
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 2. Lắng nghe lệnh từ Main Thread (Client gửi xuống)
// Đây là giải pháp cho iOS khi App đang mở (Foreground)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'Thông báo';
    const options = {
      body: event.data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
      vibrate: [200, 100, 200],
      tag: 'msg-' + Date.now(), // Luôn tạo tag mới
      renotify: true,
      requireInteraction: true 
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

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
      // Nếu không, mở cửa sổ mới
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

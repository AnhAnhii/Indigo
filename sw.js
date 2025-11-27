
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Lắng nghe sự kiện Push từ Server (Web Push API)
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
    tag: 'push-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 2. Lắng nghe lệnh từ Main Thread (Client gửi xuống để hiển thị thông báo)
// Đây là cách fix lỗi cho iOS khi gọi từ giao diện không hiện
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'Thông báo hệ thống';
    const options = {
      body: event.data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
      vibrate: [200, 100, 200],
      data: { url: '/' },
      tag: 'manual-notification-' + Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
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


self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Xử lý sự kiện Push (từ Server)
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
      tag: 'push-' + Date.now(),
      renotify: true,
      requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Xử lý tin nhắn từ App (Local Notification) - Quan trọng cho iOS PWA
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    // Lấy dữ liệu trực tiếp, tránh qua hàm trung gian để đảm bảo không mất mát dữ liệu
    const title = event.data.title || 'Thông báo';
    const body = event.data.body || 'Nội dung chi tiết...';
    const tag = event.data.tag || 'msg-' + Date.now();

    const options = {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
        tag: tag,
        renotify: true, // Rung lại khi có thông báo mới
        requireInteraction: true, // Giữ thông báo không tự tắt
        data: { url: '/' }
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
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

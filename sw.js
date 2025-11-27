
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Lắng nghe sự kiện Push từ server (hoặc giả lập từ client)
self.addEventListener('push', (event) => {
  // Payload có thể là text hoặc JSON
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
    data: {
      url: '/' // URL để mở khi click
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Xử lý khi người dùng click vào thông báo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Mở app hoặc focus vào tab đang mở
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Nếu tab đã mở và đúng URL, focus vào nó
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Nếu chưa mở, mở cửa sổ mới về trang chủ
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

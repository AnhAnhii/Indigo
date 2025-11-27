
self.addEventListener('install', (event) => {
  // Bắt buộc Service Worker kích hoạt ngay lập tức, không chờ tab cũ đóng
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Chiếm quyền kiểm soát tất cả các clients (tabs) đang mở ngay lập tức
  event.waitUntil(self.clients.claim());
});

// Cấu hình chung cho thông báo
const getNotificationOptions = (body, tag) => ({
  body: body,
  icon: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
  badge: 'https://cdn-icons-png.flaticon.com/512/1909/1909669.png',
  vibrate: [200, 100, 200, 100, 200], // Rung dài hơn để gây chú ý
  tag: tag || 'general-' + Date.now(), // Tag động để thông báo luôn nổi lên mới
  renotify: true, // Bắt buộc rung/chuông lại ngay cả khi tag trùng
  requireInteraction: true, // Giữ thông báo trên màn hình đến khi user tắt
  data: { url: '/' }
});

// 1. Xử lý sự kiện Push từ Server (Web Push API)
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

  event.waitUntil(
    self.registration.showNotification(title, getNotificationOptions(data, 'push-' + Date.now()))
  );
});

// 2. Xử lý lệnh từ Main Thread (App gửi xuống)
// Đây là luồng quan trọng nhất cho iOS khi App đang mở
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'Thông báo hệ thống';
    const body = event.data.body || '';
    const tag = event.data.tag || 'msg-' + Date.now();

    // Gửi phản hồi lại Client (Optional debugging)
    event.ports[0]?.postMessage({ status: 'received' });

    event.waitUntil(
      self.registration.showNotification(title, getNotificationOptions(body, tag))
    );
  }
});

// 3. Xử lý khi người dùng bấm vào thông báo
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Đóng thông báo

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu có tab đang mở, focus vào nó
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Nếu không, mở cửa sổ mới về trang chủ
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

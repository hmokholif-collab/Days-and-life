self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
// ملحوظة: مفيش fetch handler هنا عمدًا — مفيش cache معمول، فاعتراض الطلبات كان بيزود خطر يخربها من غير أي نفع للأوفلاين.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.includes('days-and-life'));
    if (open) return open.focus();
    return clients.openWindow('/timer');
  }));
});

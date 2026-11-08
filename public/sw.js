// Service worker — أوفلاين آمن:
// - الصفحات (navigation): الشبكة الأول، ولو مفيش نت يرجع نسخة محفوظة، ولو مفيش يرجع صفحة "مفيش نت" لطيفة.
// - الملفات الثابتة (/_next/static/ والأيقونات): من الكاش الأول، والشبكة تحدّثه في الخلفية.
// - طلبات Supabase والـ API مش بتتكاش خالص — لازم تفضل حيّة، ولو فشلت بتفشل عادي من غير ما الكاش يبوّظها.
// - اسم الكاش فيه رقم إصدار — أي نسخة جديدة بتمسح القديمة، فالتحديثات مش بتعلق.
const CACHE_NAME = 'days-life-v2';
const PRECACHE = ['/', '/dashboard', '/timer', '/today', '/icon.svg', '/manifest.webmanifest'];
const OFFLINE_HTML = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Days and Life — مفيش نت</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fff8f6;color:#19213a;text-align:center;padding:24px}h1{font-size:24px}a{display:inline-block;margin-top:16px;padding:12px 24px;border-radius:999px;background:#ff6b5f;color:#fff;text-decoration:none;font-weight:700}</style></head><body><div><h1>📶 مفيش اتصال بالإنترنت</h1><p>التطبيق محتاج نت عشان يفتح — اتأكد من الاتصال وحاول تاني.</p><a href="/dashboard">حاول تاني</a></div></body></html>';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // كل ملف لوحده — لو واحد فشل، الباقي يكمل (مفيش addAll اللي بيفشل كله).
      for (const url of PRECACHE) {
        try { await cache.add(url); } catch { /* هيتحفظ أول ما يتفتح أونلاين */ }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // طلبات خارجية وSupabase والـ API: سيبها للمتصفح، من غير كاش.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    // الصفحات: الشبكة الأول — عشان التحديثات توصل — والكاش احتياطي للأوفلاين.
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      })
    );
    return;
  }
  // الملفات الثابتة: الكاش الأول (سريعة أوفلاين)، والشبكة تحدّث الكاش في الخلفية.
  if (url.pathname.startsWith('/_next/static/') || url.pathname === '/icon.svg' || url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.includes('days-and-life'));
    if (open) return open.focus();
    return clients.openWindow('/timer');
  }));
});

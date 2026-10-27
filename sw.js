// Varry Studio — Service Worker
// غيّري رقم النسخة عند أي تحديث كبير لإجبار تنظيف الكاش القديم
const VERSION = 'v1';
const SHELL = 'varry-shell-' + VERSION;
const RUNTIME = 'varry-runtime-' + VERSION;
const PRECACHE = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;

  // 1) فتح الصفحة: الشبكة أولاً (لتصلك التحديثات)، ثم النسخة المخزنة عند انقطاع الإنترنت
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // 2) باقي الملفات (خطوط، مكتبات CDN، أيقونات): من الكاش فوراً وتتحدث بالخلفية
  event.respondWith(
    caches.open(RUNTIME).then(cache =>
      cache.match(req).then(cached => {
        const fresh = fetch(req)
          .then(res => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    )
  );
});

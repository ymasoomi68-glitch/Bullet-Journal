/* سرویس‌ورکر دفتر برنامه روزانه
 * ⚠️ برای انتشار نسخهٔ جدید، فقط عدد VERSION را عوض کن و فایل‌ها را در گیت‌هاب آپلود کن.
 *    مرورگر تغییر این فایل را تشخیص می‌دهد و دکمهٔ «به‌روزرسانی» نسخهٔ جدید را نصب می‌کند. */
const VERSION = '1.1.0';
const CACHE = 'bullet-journal-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './jalali.js',
  './app.js',
  './localforage.min.js',
  './manifest.webmanifest',
  './fonts/Vazirmatn.woff2',
  './icons/favicon.svg',
  './icons/icon-48.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  // cache: 'reload' تا نسخهٔ تازه از شبکه گرفته شود، نه از کش مرورگر
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
    )
  );
  // عمداً skipWaiting نمی‌زنیم؛ کاربر با دکمهٔ «به‌روزرسانی» تصمیم می‌گیرد.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('bullet-journal-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});

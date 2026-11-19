
const CACHE_NAME = 'qessat-masr-v3';

const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

/* تثبيت وحفظ الملفات الأساسية */
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const file of APP_FILES) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn('Cache failed:', file, error);
        }
      }

      await self.skipWaiting();
    })()
  );
});

/* تفعيل الإصدار الجديد */
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key.startsWith('qessat-masr-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

/* تحميل الصفحات والملفات */
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // لا نتدخل في طلبات المواقع الخارجية أو Supabase
  if (url.origin !== self.location.origin) return;

  // الصفحة الرئيسية
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const response = await fetch(request);

          if (response.ok) {
            await cache.put('./index.html', response.clone());
          }

          return response;
        } catch (error) {
          return (
            await cache.match('./index.html') ||
            await cache.match('./')
          );
        }
      })()
    );

    return;
  }

  // الملفات المحلية والصور
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      const cached = await cache.match(request);

      if (cached) {
        event.waitUntil(
          fetch(request)
            .then(response => {
              if (response.ok && response.type === 'basic') {
                return cache.put(request, response.clone());
              }
            })
            .catch(() => {})
        );

        return cached;
      }

      try {
        const response = await fetch(request);

        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return new Response('الملف غير متاح دون إنترنت', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      }
    })()
  );
});

console.log('Qessat Masr Offline v3 Ready');

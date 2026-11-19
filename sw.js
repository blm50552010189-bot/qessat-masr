
const CACHE_NAME = 'qessat-masr-v2';

const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

/* تثبيت التطبيق وحفظ الملفات الأساسية */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        await Promise.all(
          APP_FILES.map(async file => {
            try {
              await cache.add(file);
            } catch (error) {
              console.warn('Could not cache:', file);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* تفعيل الإصدار الجديد ومسح الكاش القديم */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* التعامل مع طلبات الملفات والصفحات */
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // نترك الطلبات الخارجية مثل Supabase دون تدخل
  if (url.origin !== self.location.origin) return;

  // الصفحة الرئيسية: الإنترنت أولاً، ثم النسخة المحفوظة
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
              cache.put('./index.html', response.clone());
            });
          }

          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);

          return (
            await cache.match(request) ||
            await cache.match('./index.html') ||
            await cache.match('./')
          );
        })
    );

    return;
  }

  // الملفات والصور: الكاش أولاً مع تحديثه من الإنترنت
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      const cached =
        await cache.match(request) ||
        await cache.match(url.pathname);

      const networkRequest = fetch(request)
        .then(async response => {
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            await cache.put(request, response.clone());

            // حفظ نسخة بدون query string أيضاً
            if (url.search) {
              await cache.put(
                new Request(url.origin + url.pathname),
                response.clone()
              );
            }
          }

          return response;
        });

      if (cached) {
        event.waitUntil(
          networkRequest.catch(() => {})
        );

        return cached;
      }

      try {
        return await networkRequest;
      } catch (error) {
        return new Response(
          'هذا الملف غير متاح دون اتصال بالإنترنت.',
          {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          }
        );
      }
    })()
  );
});

console.log('Qessat Masr Offline Cache v2 Ready');

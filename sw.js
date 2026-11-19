
const CACHE_NAME = 'qessat-masr-v4';

const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

/* INSTALL */
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const file of APP_FILES) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn('Could not cache:', file);
        }
      }

      await self.skipWaiting();
    })()
  );
});

/* ACTIVATE */
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key =>
            key.startsWith('qessat-masr-') &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

/* FETCH */
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  /* صفحات التطبيق */
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const response = await fetch(request);

          if (response.ok) {
            await cache.put('./index.html', response.clone());
            await cache.put('./', response.clone());
          }

          return response;
        } catch (error) {
          return (
            await cache.match('./index.html') ||
            await cache.match('./') ||
            new Response('التطبيق غير متاح حاليًا', {
              status: 503
            })
          );
        }
      })()
    );

    return;
  }

  /* الملفات والصور المحلية */
  const cleanRequest = new Request(
    url.origin + url.pathname,
    {
      method: 'GET',
      credentials: 'same-origin'
    }
  );

  const refreshPromise = (async () => {
    const cache = await caches.open(CACHE_NAME);

    const response = await fetch(request);

    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
      await cache.put(cleanRequest, response.clone());
    }
  })();

  event.waitUntil(refreshPromise.catch(() => {}));

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      const cached =
        await cache.match(request) ||
        await cache.match(cleanRequest);

      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
          await cache.put(cleanRequest, response.clone());
        }

        return response;
      } catch (error) {
        return new Response(
          'هذا الملف غير متاح دون إنترنت',
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

console.log('Qessat Masr Offline v4 Ready');

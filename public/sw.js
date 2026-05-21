const CACHE_NAME = 'jpaseli-v1';

// Install: cache halaman utama dan asset penting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/hiragana',
        '/katakana',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate: hapus cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: strategi "Network First, Cache Fallback"
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http schemes (seperti chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Skip API calls agar selalu fresh
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Kalau berhasil online dan scheme didukung, simpan ke cache
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone).catch(err => console.log('Cache put error:', err));
          });
        }
        return response;
      })
      .catch(() => {
        // Kalau offline, ambil dari cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback: tampilkan halaman utama jika tersedia
          return caches.match('/');
        });
      })
  );
});

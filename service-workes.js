const CACHE_NAME = 'kalori-sayici-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js'
];

// Install service worker
self.addEventListener('install', event => {
  console.log('📦 Service Worker yükleniyor...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache açıldı');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch from cache
self.addEventListener('fetch', event => {
  // API çağrılarını cache'leme - her zaman internetten al
  if (event.request.url.includes('anthropic.com') || 
      event.request.url.includes('api.')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache'de varsa cache'den döndür
        if (response) {
          console.log('📦 Cache\'den yüklendi:', event.request.url);
          return response;
        }

        // Cache'de yoksa internetten al
        return fetch(event.request).then(response => {
          // Geçerli olmayan istekleri cache'leme
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Yeni kaynağı cache'e ekle
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Offline durumda - Cache'den dönmeyi dene
          console.log('🚫 Offline - Cache kullanılıyor');
          return caches.match(event.request);
        });
      })
  );
});

// Activate and clean old caches
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker aktif ediliyor...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
  console.log('✅ Service Worker aktif!');
});
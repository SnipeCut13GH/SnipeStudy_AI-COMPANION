// A new version of the service worker will be installed when the code here changes.
// To ensure users get the latest version, we update the cache name.
const CACHE_NAME = 'educompanion-v2'; 

// A list of all the essential files the app needs to work offline.
const urlsToCache = [
  '/',
  '/index.html',
  // Note: Caching dynamic/source files like .tsx might not be ideal in a real build setup,
  // but for this environment, it helps offline functionality.
  '/index.tsx',
  // CDN URLs for libraries. These must support CORS to be cached.
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1',
  'https://aistudiocdn.com/@google/genai@^1.17.0',
  'https://aistudiocdn.com/uuid@^11.1.0',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// 'install' event: Fired when the service worker is first installed.
// We open a cache and add our essential files to it.
self.addEventListener('install', event => {
  self.skipWaiting(); // Force the new service worker to activate immediately.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache).catch(error => {
          // This catch is important so that if one URL fails (e.g., a CORS issue),
          // the entire service worker installation doesn't fail.
          console.error('Service Worker: Failed to cache one or more URLs:', error);
        });
      })
  );
});

// 'activate' event: Fired when the service worker is activated.
// This is a good time to clean up old, unused caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 'fetch' event: Fired for every network request made by the page.
// We implement a "cache-first" strategy.
self.addEventListener('fetch', event => {
  // We only handle GET requests. Other requests (POST, etc.) should pass through.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we have a matching response in the cache, return it.
        if (response) {
          return response;
        }

        // If not in cache, we fetch it from the network.
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response.
            // We can't cache non-200 responses, chrome-extension requests, etc.
            if (!networkResponse || networkResponse.status !== 200 || !['basic', 'opaque'].includes(networkResponse.type)) {
              return networkResponse;
            }
            
            // IMPORTANT: Clone the response. A response is a stream
            // and because we want both the browser and the cache to consume it,
            // we need to clone it to have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We double-check not to cache non-GET or chrome-extension requests.
                if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension://')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Service Worker: Fetching failed:', error);
            // In a real-world app, you might want to return a custom offline page here.
            throw error;
        });
      })
  );
});
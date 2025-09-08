const CACHE_NAME = 'snipestudy-v2'; // Bump version to force update
const urlsToCache = [
  '/',
  '/index.html',
  // Note: Caching dynamic/source files like .tsx might not be ideal in a real build setup,
  // but for this environment, it helps offline functionality.
  '/index.tsx',
  // CDN URLs need to support CORS to be cached by cache.addAll
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1',
  'https://aistudiocdn.com/@google/genai@^1.17.0',
  'https://aistudiocdn.com/uuid@^11.1.0',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// Clean up old caches on activation
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


self.addEventListener('install', event => {
  self.skipWaiting(); // Force the new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache one or more URLs:', error);
          // This catch is important so that if one URL fails (e.g., a CORS issue),
          // the entire service worker installation doesn't fail.
        });
      })
  );
});

self.addEventListener('fetch', event => {
  // We only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network, then cache it
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
               if (networkResponse.type !== 'opaque') { // Opaque responses are for no-cors requests, they are ok
                 console.log('Fetch error for', event.request.url, networkResponse);
               }
            }
            
            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We don't cache POST/PUT etc. and also don't cache chrome-extension:// requests
                if(event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension://')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetching failed:', error);
            // Optionally, you could return a fallback offline page here.
            throw error;
        });
      })
  );
});
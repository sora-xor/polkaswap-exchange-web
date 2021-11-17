import { setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
// import { setCatchHandler} from 'workbox-routing';

import pkg from '../package.json';

setCacheNameDetails({
  prefix: pkg.name,
  suffix: pkg.version,
});

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
  console.log('message', event);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// const precacheController = new PrecacheController();
// const { cacheName } = precacheController.strategy;

// precacheController.addToCacheList(self.__WB_MANIFEST);

// self.addEventListener('install', (event) => {
//   // Passing in event is required in Workbox v6+
//   event.waitUntil(
//     precacheController.install(event)
//       .catch(error => {
//         console.error('install error', error);
//       })
//   );
// });

// self.addEventListener('activate', (event) => {
//   // Passing in event is required in Workbox v6+
//   event.waitUntil(
//     precacheController.activate(event)
//   );
// });

// self.addEventListener('fetch', (e) => {
//   const cacheKey = precacheController.getCacheKeyForURL(e.request.url);

//   if (!cacheKey) return;

//   e.respondWith(
//     caches.open(cacheName)
//       .then(cache => cache.match(cacheKey))
//       .then(response => {
//         if (response) return response;

//         return fetch(e.request)
//           .then(response =>
//             caches.open(cacheName)
//               .then(cache => {
//                 if (e.request.method === 'GET') {
//                   cache.put(cacheKey, response.clone())
//                 }
//                 return response
//               })
//           )
//           .catch(error => {
//             console.error('fetch error', error);
//           })
//       })
//   )
// });

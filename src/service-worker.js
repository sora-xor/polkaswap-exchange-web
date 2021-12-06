import { setCacheNameDetails } from 'workbox-core';
import { PrecacheController } from 'workbox-precaching';

import pkg from '../package.json';

setCacheNameDetails({
  prefix: pkg.name,
  suffix: pkg.version,
});

const precacheController = new PrecacheController();
const { cacheName } = precacheController.strategy;

precacheController.addToCacheList(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  // Passing in event is required in Workbox v6+
  event.waitUntil(
    precacheController.install(event).catch((error) => {
      console.error('install error', error);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Passing in event is required in Workbox v6+
  event.waitUntil(precacheController.activate(event));
});

self.addEventListener('fetch', (e) => {
  const cacheKey = precacheController.getCacheKeyForURL(e.request.url);

  if (!cacheKey) return;

  e.respondWith(
    caches
      .open(cacheName)
      .then((cache) => cache.match(cacheKey))
      .then((response) => {
        if (response) return response;

        console.log('fetch', e.request.url);

        return fetch(e.request)
          .then((response) =>
            caches.open(cacheName).then((cache) => {
              if (e.request.method === 'GET') {
                cache.put(cacheKey, response.clone());
              }
              return response;
            })
          )
          .catch((error) => {
            console.error('fetch error', error);
          });
      })
  );
});

import { setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

import pkg from '../package.json';

setCacheNameDetails({
  prefix: pkg.name,
  suffix: pkg.version,
});

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

const showSkipWaitingPrompt = (event) => {
  self.addEventListener('controlling', (event) => {
    window.location.reload();
  });
};

self.addEventListener('waiting', showSkipWaitingPrompt);

self.addEventListener('message', (event) => {
  console.log(event);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

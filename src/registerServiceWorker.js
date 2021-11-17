/* eslint-disable no-console */

import { register, unregister } from 'register-service-worker';

import store from '@/store';

if (process.env.NODE_ENV === 'production') {
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready() {
      console.log(
        'App is being served from cache by a service worker.\n' + 'For more details, visit https://goo.gl/AFskqB'
      );
    },
    registered(registration) {
      console.log('Service worker has been registered.');
      if (registration.installing) {
        registration.installing.addEventListener('statechange', (event) => {
          if (event.target.state === 'redundant') {
            // redirect to tech page
            console.log('redirect app to tech page');
            // unregister service worker
            unregister();
          }
        });
      }
    },
    cached() {
      console.log('Content has been cached for offline use.');
    },
    updatefound() {
      console.log('New content is downloading.');
    },
    updated(registration) {
      console.log('New content is available; please refresh.');

      const callback = () => registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      store.dispatch('setUpdateNotification', callback);
    },
    offline() {
      console.log('No internet connection found. App is running in offline mode.');
    },
    error(error) {
      console.error('Error during service worker registration:', error);
    },
  });
}

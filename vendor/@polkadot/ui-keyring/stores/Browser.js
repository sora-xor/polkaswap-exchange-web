// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import store from 'store';
export class BrowserStore {
  all(fn) {
    store.each((value, key) => {
      fn(key, value);
    });
  }
  get(key, fn) {
    fn(store.get(key));
  }
  remove(key, fn) {
    store.remove(key);
    fn && fn();
  }
  set(key, value, fn) {
    store.set(key, value);
    fn && fn();
  }
}

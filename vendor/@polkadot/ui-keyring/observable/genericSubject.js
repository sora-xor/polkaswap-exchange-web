// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BehaviorSubject } from 'rxjs';
import { objectCopy, objectSpread } from '@polkadot/util';
import { createOptionItem } from '../options/item.js';
import { env } from './env.js';
function callNext(current, subject, withTest) {
  const isDevMode = env.isDevelopment();
  const filtered = {};
  Object.keys(current).forEach((key) => {
    const { json: { meta: { isTesting = false } = {} } = {} } = current[key];
    if (!withTest || isDevMode || isTesting !== true) {
      filtered[key] = current[key];
    }
  });
  subject.next(filtered);
}
export function genericSubject(keyCreator, withTest = false) {
  let current = {};
  const subject = new BehaviorSubject({});
  const next = () => callNext(current, subject, withTest);
  env.subject.subscribe(next);
  return {
    add: (store, address, json, type) => {
      current = objectCopy(current);
      current[address] = {
        json: objectSpread({}, json, {
          address,
        }),
        option: createOptionItem(address, json.meta.name),
        type,
      };

      // we do not store dev or injected accounts (external/transient)
      if (!json.meta.isInjected && (!json.meta.isTesting || env.isDevelopment())) {
        store.set(keyCreator(address), json);
      }
      next();
      return current[address];
    },
    remove: (store, address) => {
      current = objectCopy(current);
      delete current[address];
      store.remove(keyCreator(address));
      next();
    },
    subject,
  };
}

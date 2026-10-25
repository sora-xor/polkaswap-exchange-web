'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.genericSubject = genericSubject;
var _rxjs = require('rxjs');
var _util = require('@polkadot/util');
var _item = require('../options/item');
var _env = require('./env');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

function callNext(current, subject, withTest) {
  const isDevMode = _env.env.isDevelopment();
  const filtered = {};
  Object.keys(current).forEach((key) => {
    const { json: { meta: { isTesting = false } = {} } = {} } = current[key];
    if (!withTest || isDevMode || isTesting !== true) {
      filtered[key] = current[key];
    }
  });
  subject.next(filtered);
}
function genericSubject(keyCreator) {
  let withTest = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  let current = {};
  const subject = new _rxjs.BehaviorSubject({});
  const next = () => callNext(current, subject, withTest);
  _env.env.subject.subscribe(next);
  return {
    add: (store, address, json, type) => {
      current = (0, _util.objectCopy)(current);
      current[address] = {
        json: (0, _util.objectSpread)({}, json, {
          address,
        }),
        option: (0, _item.createOptionItem)(address, json.meta.name),
        type,
      };

      // we do not store dev or injected accounts (external/transient)
      if (!json.meta.isInjected && (!json.meta.isTesting || _env.env.isDevelopment())) {
        store.set(keyCreator(address), json);
      }
      next();
      return current[address];
    },
    remove: (store, address) => {
      current = (0, _util.objectCopy)(current);
      delete current[address];
      store.remove(keyCreator(address));
      next();
    },
    subject,
  };
}

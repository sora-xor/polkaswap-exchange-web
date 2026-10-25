'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.BrowserStore = void 0;
var _store = _interopRequireDefault(require('store'));
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

class BrowserStore {
  all(fn) {
    _store.default.each((value, key) => {
      fn(key, value);
    });
  }
  get(key, fn) {
    fn(_store.default.get(key));
  }
  remove(key, fn) {
    _store.default.remove(key);
    fn && fn();
  }
  set(key, value, fn) {
    _store.default.set(key, value);
    fn && fn();
  }
}
exports.BrowserStore = BrowserStore;

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
Object.defineProperty(exports, 'Keyring', {
  enumerable: true,
  get: function () {
    return _Keyring.Keyring;
  },
});
exports.keyring = void 0;
Object.defineProperty(exports, 'packageInfo', {
  enumerable: true,
  get: function () {
    return _packageInfo.packageInfo;
  },
});
var _Keyring = require('./Keyring');
var _packageInfo = require('./packageInfo');
// Copyright 2017-2023 @polkadot/ui-keyring authors & contributors
// SPDX-License-Identifier: Apache-2.0

const keyring = new _Keyring.Keyring();
exports.keyring = keyring;

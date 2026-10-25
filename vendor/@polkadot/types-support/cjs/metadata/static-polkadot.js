'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = void 0;
Object.defineProperty(exports, 'rpc', {
  enumerable: true,
  get: function () {
    return _polkadotRpc.default;
  },
});
Object.defineProperty(exports, 'version', {
  enumerable: true,
  get: function () {
    return _polkadotVer.default;
  },
});
var _polkadotHex = _interopRequireDefault(require('./v14/polkadot-hex'));
var _polkadotRpc = _interopRequireDefault(require('./v14/polkadot-rpc'));
var _polkadotVer = _interopRequireDefault(require('./v14/polkadot-ver'));
// Copyright 2017-2023 @polkadot/types-support authors & contributors
// SPDX-License-Identifier: Apache-2.0
var _default = _polkadotHex.default;
exports.default = _default;

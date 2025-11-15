'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = void 0;
Object.defineProperty(exports, 'rpc', {
  enumerable: true,
  get: function () {
    return _kusamaRpc.default;
  },
});
Object.defineProperty(exports, 'version', {
  enumerable: true,
  get: function () {
    return _kusamaVer.default;
  },
});
var _kusamaHex = _interopRequireDefault(require('./v14/kusama-hex'));
var _kusamaRpc = _interopRequireDefault(require('./v14/kusama-rpc'));
var _kusamaVer = _interopRequireDefault(require('./v14/kusama-ver'));
// Copyright 2017-2023 @polkadot/types-support authors & contributors
// SPDX-License-Identifier: Apache-2.0
var _default = _kusamaHex.default;
exports.default = _default;

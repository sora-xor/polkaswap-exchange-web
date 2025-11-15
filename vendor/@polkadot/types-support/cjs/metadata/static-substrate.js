'use strict';

var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');
Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = void 0;
Object.defineProperty(exports, 'rpc', {
  enumerable: true,
  get: function () {
    return _substrateRpc.default;
  },
});
Object.defineProperty(exports, 'version', {
  enumerable: true,
  get: function () {
    return _substrateVer.default;
  },
});
var _substrateHex = _interopRequireDefault(require('./v14/substrate-hex'));
var _substrateRpc = _interopRequireDefault(require('./v14/substrate-rpc'));
var _substrateVer = _interopRequireDefault(require('./v14/substrate-ver'));
// Copyright 2017-2023 @polkadot/types-support authors & contributors
// SPDX-License-Identifier: Apache-2.0
var _default = _substrateHex.default;
exports.default = _default;

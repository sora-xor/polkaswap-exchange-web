'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = void 0;
var _rpc = require('./rpc');
var _runtime = require('./runtime');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0
// order important in structs... :)
/* eslint-disable sort-keys */
var _default = {
  rpc: _rpc.rpc,
  runtime: _runtime.runtime,
  types: {
    StorageKind: {
      _enum: {
        PERSISTENT: 1,
        LOCAL: 2,
      },
    },
  },
};
exports.default = _default;

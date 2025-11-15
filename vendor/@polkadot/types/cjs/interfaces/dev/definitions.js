'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = void 0;
var _rpc = require('./rpc');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0
// order important in structs... :)
/* eslint-disable sort-keys */
var _default = {
  rpc: _rpc.rpc,
  types: {
    BlockStats: {
      witnessLen: 'u64',
      witnessCompactLen: 'u64',
      blockLen: 'u64',
      blockNumExtrinsics: 'u64',
    },
  },
};
exports.default = _default;

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
    ExtrinsicOrHash: {
      _enum: {
        Hash: 'Hash',
        Extrinsic: 'Bytes',
      },
    },
    ExtrinsicStatus: {
      _enum: {
        Future: 'Null',
        Ready: 'Null',
        Broadcast: 'Vec<Text>',
        InBlock: 'Hash',
        Retracted: 'Hash',
        FinalityTimeout: 'Hash',
        Finalized: 'Hash',
        Usurped: 'Hash',
        Dropped: 'Null',
        Invalid: 'Null',
      },
    },
  },
};
exports.default = _default;

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
    MmrBatchProof: {
      leafIndices: 'Vec<MmrLeafIndex>',
      leafCount: 'MmrNodeIndex',
      items: 'Vec<Hash>',
    },
    MmrEncodableOpaqueLeaf: 'Bytes',
    MmrError: {
      _enum: [
        'Push',
        'GetRoot',
        'Commit',
        'GenerateProof',
        'Verify',
        'LeafNotFound',
        ' PalletNotIncluded',
        'InvalidLeafIndex',
      ],
    },
    MmrLeafBatchProof: {
      blockHash: 'BlockHash',
      leaves: 'Bytes',
      proof: 'Bytes',
    },
    MmrLeafIndex: 'u64',
    MmrLeafProof: {
      blockHash: 'BlockHash',
      leaf: 'Bytes',
      proof: 'Bytes',
    },
    MmrNodeIndex: 'u64',
    MmrProof: {
      leafIndex: 'MmrLeafIndex',
      leafCount: 'MmrNodeIndex',
      items: 'Vec<Hash>',
    },
  },
};
exports.default = _default;

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = void 0;
var _runtime = require('./runtime');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0
// order important in structs... :)
/* eslint-disable sort-keys */
var _default = {
  rpc: {},
  runtime: _runtime.runtime,
  types: {
    CheckInherentsResult: {
      okay: 'bool',
      fatalError: 'bool',
      errors: 'InherentData',
    },
    InherentData: {
      data: 'BTreeMap<InherentIdentifier, Bytes>',
    },
    InherentIdentifier: '[u8; 8]',
  },
};
exports.default = _default;

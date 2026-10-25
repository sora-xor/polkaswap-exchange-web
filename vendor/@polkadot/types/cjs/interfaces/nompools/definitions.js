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
    NpApiError: {
      _enum: ['MemberNotFound', 'OverflowInPendingRewards'],
    },
  },
};
exports.default = _default;

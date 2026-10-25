'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.rpc = void 0;
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const rpc = {
  localStorageGet: {
    description: 'Get offchain local storage under given key and prefix',
    params: [
      {
        name: 'kind',
        type: 'StorageKind',
      },
      {
        name: 'key',
        type: 'Bytes',
      },
    ],
    type: 'Option<Bytes>',
  },
  localStorageSet: {
    description: 'Set offchain local storage under given key and prefix',
    params: [
      {
        name: 'kind',
        type: 'StorageKind',
      },
      {
        name: 'key',
        type: 'Bytes',
      },
      {
        name: 'value',
        type: 'Bytes',
      },
    ],
    type: 'Null',
  },
};
exports.rpc = rpc;

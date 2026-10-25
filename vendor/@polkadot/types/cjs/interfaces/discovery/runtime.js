'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.runtime = void 0;
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const runtime = {
  AuthorityDiscoveryApi: [
    {
      methods: {
        authorities: {
          description: 'Retrieve authority identifiers of the current and next authority set.',
          params: [],
          type: 'Vec<AuthorityId>',
        },
      },
      version: 1,
    },
  ],
};
exports.runtime = runtime;

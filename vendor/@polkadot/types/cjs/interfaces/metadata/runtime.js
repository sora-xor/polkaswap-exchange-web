'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.runtime = void 0;
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const runtime = {
  Metadata: [
    {
      methods: {
        metadata: {
          description: 'Returns the metadata of a runtime',
          params: [],
          type: 'OpaqueMetadata',
        },
      },
      version: 1,
    },
  ],
};
exports.runtime = runtime;

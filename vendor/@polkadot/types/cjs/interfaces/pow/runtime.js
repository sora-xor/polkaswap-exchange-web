'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.runtime = void 0;
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const runtime = {
  DifficultyApi: [
    {
      methods: {
        difficulty: {
          description: 'Return the target difficulty of the next block.',
          params: [],
          // This is Difficulty in the original, however this is chain-specific
          type: 'Raw',
        },
      },
      version: 1,
    },
  ],
  TimestampApi: [
    {
      methods: {
        timestamp: {
          description: 'API necessary for timestamp-based difficulty adjustment algorithms.',
          params: [],
          type: 'Moment',
        },
      },
      version: 1,
    },
  ],
};
exports.runtime = runtime;

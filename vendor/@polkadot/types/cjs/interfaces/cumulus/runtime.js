'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.runtime = void 0;
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const runtime = {
  CollectCollationInfo: [
    {
      methods: {
        collect_collation_info: {
          description: 'Collect information about a collation.',
          params: [
            {
              name: 'header',
              type: 'Header',
            },
          ],
          type: 'CollationInfo',
        },
      },
      version: 2,
    },
    {
      methods: {
        collect_collation_info: {
          description: 'Collect information about a collation.',
          params: [],
          type: 'CollationInfoV1',
        },
      },
      version: 1,
    },
  ],
};
exports.runtime = runtime;

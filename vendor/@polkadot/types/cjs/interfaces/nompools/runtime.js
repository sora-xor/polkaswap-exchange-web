'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.runtime = void 0;
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const runtime = {
  NominationPoolsApi: [
    {
      methods: {
        pending_rewards: {
          description: 'Returns the pending rewards for the given member.',
          params: [
            {
              name: 'member',
              type: 'AccountId',
            },
          ],
          type: 'Balance',
        },
      },
      version: 1,
    },
  ],
};
exports.runtime = runtime;

// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const runtime = {
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

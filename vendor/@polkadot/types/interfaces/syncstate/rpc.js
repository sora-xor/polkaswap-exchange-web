// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const rpc = {
  genSyncSpec: {
    description: 'Returns the json-serialized chainspec running the node, with a sync state.',
    endpoint: 'sync_state_genSyncSpec',
    params: [
      {
        name: 'raw',
        type: 'bool',
      },
    ],
    type: 'Json',
  },
};

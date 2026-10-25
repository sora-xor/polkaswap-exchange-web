'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.rpc = void 0;
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const rpc = {
  getFinalizedHead: {
    description: 'Returns hash of the latest BEEFY finalized block as seen by this client.',
    params: [],
    type: 'H256',
  },
  subscribeJustifications: {
    description: 'Returns the block most recently finalized by BEEFY, alongside side its justification.',
    params: [],
    pubsub: ['justifications', 'subscribeJustifications', 'unsubscribeJustifications'],
    type: 'BeefySignedCommitment',
  },
};
exports.rpc = rpc;

// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

// order important in structs... :)
/* eslint-disable sort-keys */

import { runtime } from './runtime.js';
export default {
  rpc: {},
  runtime,
  types: {
    RawAuraPreDigest: {
      slotNumber: 'u64',
    },
  },
};

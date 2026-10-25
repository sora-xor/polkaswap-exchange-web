'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.runtime = void 0;
var _util = require('@polkadot/util');
// Copyright 2017-2023 @polkadot/types authors & contributors
// SPDX-License-Identifier: Apache-2.0

const CORE_V1_TO_V4 = {
  execute_block: {
    description: 'Execute the given block.',
    params: [
      {
        name: 'block',
        type: 'Block',
      },
    ],
    type: 'Null',
  },
};
const CORE_V1_TO_V2 = {
  version: {
    description: 'Returns the version of the runtime.',
    params: [],
    type: 'RuntimeVersionPre3',
  },
};
const CORE_V2_TO_V4 = {
  initialize_block: {
    description: 'Initialize a block with the given header.',
    params: [
      {
        name: 'header',
        type: 'Header',
      },
    ],
    type: 'Null',
  },
};
const runtime = {
  Core: [
    {
      methods: (0, _util.objectSpread)(
        {
          version: {
            description: 'Returns the version of the runtime.',
            params: [],
            type: 'RuntimeVersion',
          },
        },
        CORE_V1_TO_V4,
        CORE_V2_TO_V4
      ),
      version: 4,
    },
    {
      methods: (0, _util.objectSpread)(
        {
          version: {
            description: 'Returns the version of the runtime.',
            params: [],
            type: 'RuntimeVersionPre4',
          },
        },
        CORE_V1_TO_V4,
        CORE_V2_TO_V4
      ),
      version: 3,
    },
    {
      methods: (0, _util.objectSpread)({}, CORE_V1_TO_V2, CORE_V1_TO_V4, CORE_V2_TO_V4),
      version: 2,
    },
    {
      methods: (0, _util.objectSpread)(
        {
          initialise_block: {
            description: 'Initialize a block with the given header.',
            params: [
              {
                name: 'header',
                type: 'Header',
              },
            ],
            type: 'Null',
          },
        },
        CORE_V1_TO_V2,
        CORE_V1_TO_V4
      ),
      version: 1,
    },
  ],
};
exports.runtime = runtime;

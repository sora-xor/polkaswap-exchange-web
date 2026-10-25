import definitions from '@polkadot/types/interfaces/runtime/definitions';
import runtime from '../../../../type-definitions/src/runtime.ts';
import type { Definitions } from '@polkadot/types/types';

export default {
  rpc: {},
  types: {
    ...definitions.types,
    ...runtime.types,
  },
} as Definitions;

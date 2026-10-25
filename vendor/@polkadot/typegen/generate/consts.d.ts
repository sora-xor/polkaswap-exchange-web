import type { HexString } from '@polkadot/util/types';
import type { ExtraTypes } from './types';
import { Definitions } from '@polkadot/types/types';
/** @internal */
export declare function generateDefaultConsts(
  dest: string,
  data: HexString,
  extraTypes?: ExtraTypes,
  isStrict?: boolean,
  customLookupDefinitions?: Definitions
): void;

import type { HexString } from '@polkadot/util/types';
import type { ExtraTypes } from './types';
import { Definitions } from '@polkadot/types/types';
/** @internal */
export declare function generateDefaultEvents(
  dest: string,
  data: HexString,
  extraTypes?: ExtraTypes,
  isStrict?: boolean,
  customLookupDefinitions?: Definitions
): void;

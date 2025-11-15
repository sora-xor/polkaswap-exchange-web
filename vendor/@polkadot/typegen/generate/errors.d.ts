import type { HexString } from '@polkadot/util/types';
import type { ExtraTypes } from './types';
/** @internal */
export declare function generateDefaultErrors(
  dest: string,
  data: HexString,
  extraTypes?: ExtraTypes,
  isStrict?: boolean
): void;

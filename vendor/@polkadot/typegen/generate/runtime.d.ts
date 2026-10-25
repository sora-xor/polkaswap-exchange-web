import type { Metadata } from '@polkadot/types/metadata/Metadata';
import type { Definitions, Registry } from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';
import type { ExtraTypes } from './types';
/** @internal */
export declare function generateCallTypes(
  registry: Registry,
  meta: Metadata,
  dest: string,
  extraTypes: ExtraTypes,
  isStrict: boolean,
  customLookupDefinitions?: Definitions
): void;
export declare function generateDefaultRuntime(
  dest: string,
  data: HexString,
  extraTypes?: ExtraTypes,
  isStrict?: boolean,
  customLookupDefinitions?: Definitions
): void;

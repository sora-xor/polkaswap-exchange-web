import type { HexString } from '@polkadot/util/types';
import type { ExtraTypes } from '../generate/types';
import { Metadata, TypeRegistry } from '@polkadot/types';
interface Result {
  metadata: Metadata;
  registry: TypeRegistry;
}
export declare function initMeta(staticMeta: HexString, extraTypes?: ExtraTypes): Result;
export {};

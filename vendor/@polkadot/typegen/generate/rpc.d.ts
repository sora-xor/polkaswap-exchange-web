import type { TypeRegistry } from '@polkadot/types/create';
import type { Definitions } from '@polkadot/types/types';
import type { ExtraTypes } from './types';
/** @internal */
export declare function generateRpcTypes(
  registry: TypeRegistry,
  importDefinitions: Record<string, Definitions>,
  dest: string,
  extraTypes: ExtraTypes
): void;
export declare function generateDefaultRpc(dest?: string, extraTypes?: ExtraTypes): void;

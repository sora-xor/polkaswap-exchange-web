import type { Registry } from '@polkadot/types/types';
import { ModuleTypes, TypeImports } from './imports';
/** @internal */
export declare function getSimilarTypes(
  registry: Registry,
  definitions: Record<string, ModuleTypes>,
  _type: string,
  imports: TypeImports
): string[];

import type { AnyString, Registry } from '@polkadot/types/types';
import type { TypeDef } from '@polkadot/types-create/types';
import { ModuleTypes, TypeImports } from './imports';
export declare const HEADER: (type: 'chain' | 'defs') => string;
/** @internal */
export declare function exportInterface(
  lookupIndex: number | undefined,
  name: string | undefined,
  base: string,
  body?: string,
  withShortcut?: boolean
): string;
/**
 * Correctly format a given type
 */
/** @internal */
export declare function formatType(
  registry: Registry,
  definitions: Record<string, ModuleTypes>,
  type: AnyString | TypeDef,
  imports: TypeImports,
  withShortcut?: boolean
): string;

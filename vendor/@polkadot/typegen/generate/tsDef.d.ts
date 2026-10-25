import type { Registry } from '@polkadot/types/types';
import type { TypeDef } from '@polkadot/types-create/types';
import type { ModuleTypes } from '../util/imports';
import { TypeDefInfo } from '@polkadot/types-create';
import { TypeImports } from '../util';
/** @internal */
export declare function createGetter(
  definitions: Record<string, ModuleTypes>,
  name: string | undefined,
  type: string,
  imports: TypeImports
): string;
export declare const typeEncoders: Record<
  TypeDefInfo,
  (registry: Registry, definitions: Record<string, ModuleTypes>, def: TypeDef, imports: TypeImports) => string
>;
/** @internal */
export declare function generateTsDefFor(
  registry: Registry,
  importDefinitions: {
    [importPath: string]: Record<string, ModuleTypes>;
  },
  defName: string,
  {
    types,
  }: {
    types: Record<string, any>;
  },
  outputDir: string
): void;
/** @internal */
export declare function generateTsDef(
  importDefinitions: {
    [importPath: string]: Record<string, ModuleTypes>;
  },
  outputDir: string,
  generatingPackage: string
): void;
/** @internal */
export declare function generateDefaultTsDef(): void;

import { ModuleTypes } from '../util/imports';
/** @internal */
export declare function generateInterfaceTypes(
  importDefinitions: {
    [importPath: string]: Record<string, ModuleTypes>;
  },
  dest: string
): void;
export declare function generateDefaultInterface(): void;

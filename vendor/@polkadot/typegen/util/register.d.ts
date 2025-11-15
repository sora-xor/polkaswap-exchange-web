import { TypeRegistry } from '@polkadot/types/create';
export declare function registerDefinitions(
  registry: TypeRegistry,
  extras: Record<
    string,
    Record<
      string,
      {
        types: Record<string, any>;
      }
    >
  >
): void;

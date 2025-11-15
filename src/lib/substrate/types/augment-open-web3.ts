import type { ObservableMap } from 'mobx';

declare module '@open-web3/api-mobx' {
  export type StorageDoubleMap<Key1, Key2, T> = {
    (key1: Key1, key2: Key2): T | null;
    entries: () => ObservableMap<string, T>;
  };
}

export {};

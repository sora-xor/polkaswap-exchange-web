import type { KeyringJson, KeyringStore } from '../types';
export declare class BrowserStore implements KeyringStore {
  all(fn: (key: string, value: KeyringJson) => void): void;
  get(key: string, fn: (value: KeyringJson) => void): void;
  remove(key: string, fn?: () => void): void;
  set(key: string, value: KeyringJson, fn?: () => void): void;
}

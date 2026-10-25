import type { KeyringJson, KeyringStore } from '../types';
export declare class FileStore implements KeyringStore {
  #private;
  constructor(path: string);
  all(fn: (key: string, value: KeyringJson) => void): void;
  get(key: string, fn: (value: KeyringJson) => void): void;
  remove(key: string, fn?: () => void): void;
  set(key: string, value: KeyringJson, fn?: () => void): void;
  private _getPath;
  private _readKey;
}

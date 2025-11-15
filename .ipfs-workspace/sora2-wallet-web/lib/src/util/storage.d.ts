import { Storage } from '@sora-substrate/sdk';
import type { StorageKey, RuntimeStorageKey, SettingsStorageKey } from '../types/common';
/** Persists state tied to the active account (cleared on logout). */
export declare const storage: Storage<StorageKey>;
/** Holds runtime-derived values that should reset when the API version changes. */
export declare const runtimeStorage: Storage<RuntimeStorageKey>;
/** Stores global, long-lived wallet settings. */
export declare const settingsStorage: Storage<SettingsStorageKey>;

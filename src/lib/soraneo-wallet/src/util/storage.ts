import { Storage } from '@/lib/substrate/sdk/storage';

import type { StorageKey, RuntimeStorageKey, SettingsStorageKey } from '../types/common';
/** Persists state tied to the active account (cleared on logout). */
export const storage = new Storage<StorageKey>();

/** Holds runtime-derived values that should reset when the API version changes. */
export const runtimeStorage = new Storage<RuntimeStorageKey>('runtime');

/** Stores global, long-lived wallet settings. */
export const settingsStorage = new Storage<SettingsStorageKey>('dexSettings');

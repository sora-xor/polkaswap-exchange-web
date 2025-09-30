import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sora-substrate/sdk', () => ({
  Storage: class {
    namespace: string;
    constructor(namespace: string) {
      this.namespace = namespace;
    }
  },
}));

vi.mock('@soramitsu/soraneo-wallet-web', () => ({
  WALLET_CONSTS: { TranslationConsts: {} },
  storage: {},
  settingsStorage: {},
}));

import { LOCAL_STORAGE_MAX_SIZE, listOfRemoveForLocalStorage } from '@/consts/index';
import { calculateStorageUsagePercentage, clearLocalStorage } from '@/utils/storage';

describe('storage utilities', () => {
  class LocalStorageMock {
    private readonly store!: Map<string, string>;

    constructor() {
      Object.defineProperty(this, 'store', {
        value: new Map<string, string>(),
        writable: false,
        enumerable: false,
      });
    }

    get length(): number {
      return this.store.size;
    }

    clear() {
      for (const key of Array.from(this.store.keys())) {
        delete (this as any)[key];
      }
      this.store.clear();
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    getItem(key: string): string | null {
      return this.store.get(key) ?? null;
    }

    setItem(key: string, value: string) {
      const normalized = String(value);
      this.store.set(key, normalized);
      Object.defineProperty(this, key, {
        value: normalized,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }

    removeItem(key: string) {
      this.store.delete(key);
      delete (this as any)[key];
    }
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('localStorage', new LocalStorageMock());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculateStorageUsagePercentage returns zero for empty storage', () => {
    expect(calculateStorageUsagePercentage()).toBe(0);
  });

  it('calculateStorageUsagePercentage accounts for key and value byte size', () => {
    localStorage.setItem('wallet.history', 'a'.repeat(4));
    const expectedBytes = ('wallet.history'.length + 4) * 2;
    const expectedPercentage = (expectedBytes / LOCAL_STORAGE_MAX_SIZE) * 100;

    expect(calculateStorageUsagePercentage()).toBeCloseTo(expectedPercentage, 10);
  });

  it('clearLocalStorage removes only matching keys', () => {
    const removableKey = `state${listOfRemoveForLocalStorage[0]}`;
    const preservedKey = 'ui.theme';
    localStorage.setItem(removableKey, 'sensitive');
    localStorage.setItem(preservedKey, 'dark');

    clearLocalStorage();

    expect(localStorage.getItem(removableKey)).toBeNull();
    expect(localStorage.getItem(preservedKey)).toBe('dark');
  });
});

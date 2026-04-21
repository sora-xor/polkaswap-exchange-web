import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sora-substrate/sdk', () => ({
  Storage: class {
    namespace: string;
    constructor(namespace: string) {
      this.namespace = namespace;
    }
    set() {}
    get() {
      return null;
    }
    remove() {}
  },
  api: {
    setStorage: vi.fn(),
    shouldPairBeLocked: false,
    initKeyring: vi.fn(),
  },
  connection: {},
  Operation: {
    SwapAndSend: 'SwapAndSend',
    Transfer: 'Transfer',
    VestedTransfer: 'VestedTransfer',
    SwapTransferBatch: 'SwapTransferBatch',
    Mint: 'Mint',
  },
  TransactionStatus: {
    Finalized: 'Finalized',
    Pending: 'Pending',
    Failed: 'Failed',
  },
}));

const walletOverrides = vi.hoisted(() => ({
  storage: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
  settingsStorage: {
    set: vi.fn(),
    get: vi.fn(() => null),
    remove: vi.fn(),
  },
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const walletStub = await vi.importActual<typeof import('@tests/stubs/walletRuntime')>('@tests/stubs/walletRuntime');
  return {
    ...walletStub,
    ...walletOverrides,
    default: {
      ...(walletStub as { default?: Record<string, unknown> }).default,
      ...walletOverrides,
    },
  };
});

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

  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    vi.stubGlobal('localStorage', new LocalStorageMock());
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.stubGlobal('localStorage', originalLocalStorage);
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

import { AES } from 'crypto-js';
import { describe, expect, beforeAll, afterAll, beforeEach, it, vi } from 'vitest';

const LEGACY_KEY = 'U2FsdGVkX18ZUVvShFSES21qHsQEqZXMxQ9zgHy';

const { localStorageMock, localStore } = vi.hoisted(() => {
  const backingStore = new Map<string, string>();

  const storage = {
    getItem: vi.fn((key: string) => (backingStore.has(key) ? backingStore.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      backingStore.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      backingStore.delete(key);
    }),
    clear: vi.fn(() => {
      backingStore.clear();
    }),
    key: vi.fn((index: number) => Array.from(backingStore.keys())[index] ?? null),
    get length() {
      return backingStore.size;
    },
  } as Storage & {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    key: ReturnType<typeof vi.fn>;
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage, localStore: backingStore };
});

const originalConsoleWarn = console.warn;
const polkadotVersionWarning = '@polkadot/util has multiple versions';
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes(polkadotVersionWarning)) {
    return;
  }

  originalConsoleWarn(...(args as Parameters<typeof console.warn>));
});

const importCryptoModule = () => import('@/lib/substrate/sdk/crypto');
const importStorageModule = () => import('@/lib/substrate/sdk/storage');

describe('substrate crypto helpers', () => {
  beforeAll(() => {
    localStore.clear();
  });

  beforeEach(() => {
    localStore.clear();
    localStorageMock.clear.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.key.mockClear();
    vi.resetModules();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    consoleWarnSpy.mockRestore();
  });

  it('encrypts with a versioned prefix and decrypts symmetrically', async () => {
    const { encrypt, decrypt } = await importCryptoModule();

    const cipher = encrypt('hello-world');
    expect(cipher.startsWith('psk1:')).toBe(true);
    expect(decrypt(cipher)).toBe('hello-world');
  });

  it('decrypts legacy payloads produced with the shared key', async () => {
    const { decrypt } = await importCryptoModule();

    const legacyCipher = AES.encrypt('legacy', LEGACY_KEY).toString();
    expect(decrypt(legacyCipher)).toBe('legacy');
  });

  it('derives current and legacy namespaces and migrates storage entries', async () => {
    const { deriveAddressNamespaces } = await importCryptoModule();
    const { AccountStorage } = await importStorageModule();

    const namespaces = deriveAddressNamespaces('5CPzznGLegacyAddress');
    expect(namespaces.current).toBeTruthy();

    if (namespaces.legacy.length) {
      const legacyNamespace = namespaces.legacy[0];
      const legacyKey = `account:${legacyNamespace}.history`;
      const payload = JSON.stringify({ foo: 'bar' });

      localStorage.setItem(legacyKey, payload);

      const storage = new AccountStorage(namespaces.current, namespaces.legacy);

      expect(storage.get('history')).toBe(payload);
      expect(localStorage.getItem(`account:${namespaces.current}.history`)).toBe(payload);
      expect(localStorage.getItem(legacyKey)).toBeNull();
    }
  });
});

// @vitest-environment node
// Real WebCrypto and structured cloning of CryptoKey, as IndexedDB does it.
import { describe, expect, it } from 'vitest';

import {
  createTemporaryWalletVaultStore,
  isTemporaryWalletVaultRecord,
  openTemporaryWalletVault,
  sealTemporaryWallet,
  TEMPORARY_WALLET_VAULT_DB,
  type TemporaryWalletVaultRecord,
} from '@/utils/connection/evm/temporaryWalletVault';

const PHRASE = 'test test test test test test test test test test test junk';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OWNER = 'cnTQ1kbv7PBNNQrEb1tZpmK7hZnSqP2ZzVbT9u4FjM4hYWYmt';

/** Minimal IndexedDB: one database, one object store, structured-clone persistence. */
function fakeIndexedDb() {
  const data = new Map<string, unknown>();
  const opened: string[] = [];
  const request = <T>(run: () => T) => {
    const result = { result: undefined as T | undefined, onsuccess: null as null | (() => void) };
    queueMicrotask(() => {
      result.result = run();
      result.onsuccess?.();
    });
    return result;
  };
  const database = {
    objectStoreNames: { contains: (name: string) => name === 'vault' && data.has('__store__') },
    createObjectStore: () => data.set('__store__', true),
    transaction: () => {
      const tx = { oncomplete: null as null | (() => void), onerror: null, onabort: null, error: null };
      const store = {
        get: (key: string) => request(() => (data.has(key) ? structuredClone(data.get(key)) : undefined)),
        put: (value: unknown, key: string) => request(() => data.set(key, structuredClone(value))),
        delete: (key: string) => request(() => data.delete(key)),
      };
      setTimeout(() => tx.oncomplete?.(), 0);
      return {
        ...tx,
        objectStore: () => store,
        set oncomplete(fn: () => void) {
          tx.oncomplete = fn;
        },
        set onerror(_fn: unknown) {},
        set onabort(_fn: unknown) {},
      };
    },
    close: () => undefined,
    onversionchange: null,
  };
  const factory = {
    open: (name: string) => {
      opened.push(name);
      const open = {
        result: database,
        onupgradeneeded: null as null | (() => void),
        onsuccess: null as null | (() => void),
        onerror: null,
        onblocked: null,
      };
      setTimeout(() => {
        if (!data.has('__store__')) open.onupgradeneeded?.();
        open.onsuccess?.();
      }, 0);
      return open;
    },
  };
  return { factory: factory as unknown as IDBFactory, data, opened };
}

describe('temporary wallet vault', () => {
  it('encrypts the phrase under a non-extractable key and opens it again after a structured clone', async () => {
    const record = await sealTemporaryWallet(PHRASE, ADDRESS, OWNER);
    expect(record).toMatchObject({ version: 1, address: ADDRESS, owner: OWNER });
    expect(record.key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', record.key)).rejects.toThrow();
    expect(Buffer.from(record.ciphertext).toString('utf8')).not.toContain('junk');
    expect(record.iv.byteLength).toBe(12);

    const stored = structuredClone(record);
    expect(await openTemporaryWalletVault(stored, OWNER)).toBe(PHRASE);
  });

  it('refuses another SORA account and any tampering with the address, IV or ciphertext', async () => {
    const record = await sealTemporaryWallet(PHRASE, ADDRESS, OWNER);
    await expect(openTemporaryWalletVault(record, 'someone-else')).rejects.toThrow();
    await expect(
      openTemporaryWalletVault({ ...record, address: '0x0000000000000000000000000000000000000001' }, OWNER)
    ).rejects.toThrow();
    const iv = Uint8Array.from(record.iv);
    iv[0] ^= 1;
    await expect(openTemporaryWalletVault({ ...record, iv }, OWNER)).rejects.toThrow();
    const ciphertext = new Uint8Array(record.ciphertext.slice(0));
    ciphertext[0] ^= 1;
    await expect(openTemporaryWalletVault({ ...record, ciphertext: ciphertext.buffer }, OWNER)).rejects.toThrow();
  });

  it('uses a fresh key and IV for every wallet', async () => {
    const first = await sealTemporaryWallet(PHRASE, ADDRESS, OWNER);
    const second = await sealTemporaryWallet(PHRASE, ADDRESS, OWNER);
    expect(Buffer.from(first.iv).equals(Buffer.from(second.iv))).toBe(false);
    await expect(openTemporaryWalletVault({ ...second, key: first.key }, OWNER)).rejects.toThrow();
  });

  it('accepts only well-formed records', async () => {
    const record = await sealTemporaryWallet(PHRASE, ADDRESS, OWNER);
    expect(isTemporaryWalletVaultRecord(record)).toBe(true);
    for (const broken of [
      null,
      { ...record, version: 2 },
      { ...record, address: 'not-an-address' },
      { ...record, owner: '' },
      { ...record, iv: new Uint8Array(8) },
      { ...record, ciphertext: 'text' },
      { ...record, key: undefined },
    ]) {
      expect(isTemporaryWalletVaultRecord(broken)).toBe(false);
    }
    await expect(sealTemporaryWallet('', ADDRESS, OWNER)).rejects.toThrow();
  });

  it('keeps one record per SORA account in IndexedDB and removes it on request', async () => {
    const { factory, data, opened } = fakeIndexedDb();
    const store = createTemporaryWalletVaultStore(factory);
    expect(await store.read(OWNER)).toBeUndefined();
    const record = await sealTemporaryWallet(PHRASE, ADDRESS, OWNER);
    await store.write(record);
    const read = (await store.read(OWNER)) as TemporaryWalletVaultRecord;
    expect(read.address).toBe(ADDRESS);
    expect(await openTemporaryWalletVault(read, OWNER)).toBe(PHRASE);
    expect(await store.read('another-account')).toBeUndefined();
    expect(opened[0]).toBe(TEMPORARY_WALLET_VAULT_DB);

    data.set(OWNER, { version: 1, address: 'junk' });
    expect(await store.read(OWNER)).toBeUndefined();
    data.set('another-account', record);
    expect(await store.read('another-account')).toBeUndefined();

    await store.write(record);
    await store.remove(OWNER);
    expect(await store.read(OWNER)).toBeUndefined();
  });

  it('fails clearly without IndexedDB', async () => {
    await expect(createTemporaryWalletVaultStore(undefined).read(OWNER)).rejects.toThrow('IndexedDB unavailable');
  });
});

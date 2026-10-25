/**
 * Encrypted browser storage for the temporary Ethereum wallet, so a card purchase survives a closed tab.
 *
 * The recovery phrase is encrypted with AES-GCM under a random 256-bit key that the browser creates as
 * non-extractable: page code can use it to decrypt, but nothing can read the raw key bytes back out. Key and
 * ciphertext live in this origin's IndexedDB. This keeps the phrase out of anything that only reads saved browser
 * data (generic stealers, storage dumps). It does not protect against code running inside the Polkaswap page itself.
 * The SORA account the purchase belongs to is bound in as authenticated data, so a record is only opened for it.
 */

export const TEMPORARY_WALLET_VAULT_DB = 'polkaswap-temporary-wallet-v1';
const STORE = 'vault';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** What is stored. `address` and `owner` are public; only the phrase is secret. */
export interface TemporaryWalletVaultRecord {
  version: 1;
  /** Checksummed Ethereum address of the stored wallet. */
  address: string;
  /** SORA account that receives this purchase; the record opens only for it. */
  owner: string;
  createdAt: number;
  key: CryptoKey;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}

/** One record per SORA account, keyed by that account. */
export interface TemporaryWalletVaultStore {
  read(owner: string): Promise<TemporaryWalletVaultRecord | undefined>;
  write(record: TemporaryWalletVaultRecord): Promise<void>;
  remove(owner: string): Promise<void>;
}

const binding = (address: string, owner: string) =>
  encoder.encode(`polkaswap-temporary-wallet:v1:${address.toLowerCase()}:${owner}`);

/** Copies into this realm's Uint8Array: WebCrypto rejects views from another realm (seen under jsdom). */
const bytes = (value: ArrayBuffer | ArrayBufferView): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(
    value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  );

/** Encrypts the phrase under a new non-extractable key. */
export async function sealTemporaryWallet(
  phrase: string,
  address: string,
  owner: string,
  subtle: SubtleCrypto = globalThis.crypto.subtle,
  random: (array: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer> = (array) =>
    globalThis.crypto.getRandomValues(array)
): Promise<TemporaryWalletVaultRecord> {
  if (!phrase || !address || !owner) throw new Error('Incomplete temporary wallet');
  const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = random(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: binding(address, owner) },
    key,
    bytes(encoder.encode(phrase))
  );
  return { version: 1, address, owner, createdAt: Date.now(), key, iv, ciphertext };
}

/** Decrypts a record for its owner; any tampering, other owner or broken record throws. */
export async function openTemporaryWalletVault(
  record: TemporaryWalletVaultRecord,
  owner: string,
  subtle: SubtleCrypto = globalThis.crypto.subtle
): Promise<string> {
  if (!isTemporaryWalletVaultRecord(record) || record.owner !== owner) throw new Error('Temporary wallet unavailable');
  const plain = await subtle.decrypt(
    { name: 'AES-GCM', iv: bytes(record.iv), additionalData: binding(record.address, record.owner) },
    record.key,
    bytes(record.ciphertext)
  );
  return decoder.decode(plain);
}

/** Shape check for what IndexedDB returns; old or foreign records are ignored rather than trusted. */
export function isTemporaryWalletVaultRecord(value: unknown): value is TemporaryWalletVaultRecord {
  const record = value as Partial<TemporaryWalletVaultRecord> | null;
  return (
    !!record &&
    typeof record === 'object' &&
    record.version === 1 &&
    typeof record.address === 'string' &&
    /^0x[0-9a-fA-F]{40}$/.test(record.address) &&
    typeof record.owner === 'string' &&
    record.owner.length > 0 &&
    record.owner.length <= 128 &&
    typeof record.createdAt === 'number' &&
    !!record.key &&
    typeof record.key === 'object' &&
    (record.iv instanceof Uint8Array || ArrayBuffer.isView(record.iv)) &&
    (record.iv as Uint8Array).byteLength === 12 &&
    (record.ciphertext instanceof ArrayBuffer || ArrayBuffer.isView(record.ciphertext))
  );
}

/** IndexedDB-backed store; rejects when the browser has no IndexedDB or refuses storage (some private modes). */
export function createTemporaryWalletVaultStore(
  factory: IDBFactory | undefined = globalThis.indexedDB
): TemporaryWalletVaultStore {
  let database: Promise<IDBDatabase> | undefined;
  const open = (): Promise<IDBDatabase> => {
    if (!factory) return Promise.reject(new Error('IndexedDB unavailable'));
    return (database ??= new Promise((resolve, reject) => {
      const request = factory.open(TEMPORARY_WALLET_VAULT_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onerror = request.onblocked = () => {
        database = undefined;
        reject(new Error('IndexedDB unavailable'));
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
    }));
  };
  const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    });
  };
  return {
    read: async (owner) => {
      const value = await run('readonly', (store) => store.get(owner));
      return isTemporaryWalletVaultRecord(value) && value.owner === owner ? value : undefined;
    },
    write: (record) => run('readwrite', (store) => store.put(record, record.owner)).then(() => undefined),
    remove: (owner) => run('readwrite', (store) => store.delete(owner)).then(() => undefined),
  };
}

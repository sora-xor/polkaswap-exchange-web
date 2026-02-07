import { FPNumber } from '@sora-substrate/math';
import { vi } from 'vitest';
export { WithConnectionApi, WithKeyring } from '@/lib/substrate/sdk/apiAccount';

type StorageValue = string;

const normalizeValue = (value: unknown): StorageValue => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object Object]';
    }
  }
  return String(value);
};

class StorageNamespace<Key = string> {
  private store = new Map<string, StorageValue>();

  constructor(private prefix: string) {}

  private makeKey(key: Key): string {
    return `${this.prefix}:${String(key)}`;
  }

  get(key: Key): StorageValue {
    return this.store.get(this.makeKey(key)) ?? '';
  }

  set(key: Key, value: unknown): void {
    this.store.set(this.makeKey(key), normalizeValue(value));
  }

  remove(key: Key): void {
    this.store.delete(this.makeKey(key));
  }

  entries(): Array<[string, StorageValue]> {
    return Array.from(this.store.entries());
  }

  clear(): void {
    this.store.clear();
  }
}

export class Storage<Key = string> {
  private static namespaces = new Map<string, StorageNamespace>();
  private namespace: StorageNamespace<Key>;

  constructor(private name = 'sora') {
    if (!Storage.namespaces.has(name)) {
      Storage.namespaces.set(name, new StorageNamespace<Key>(name));
    }

    this.namespace = Storage.namespaces.get(name)! as StorageNamespace<Key>;
  }

  all(): Array<Array<any>> {
    return this.namespace.entries();
  }

  get(key: Key): StorageValue {
    return this.namespace.get(key);
  }

  set(key: Key, value: unknown): void {
    this.namespace.set(key, value);
  }

  remove(key: Key): void {
    this.namespace.remove(key);
  }

  clear(): void {
    this.namespace.clear();
  }
}

export class AccountStorage<Key = string> extends Storage<Key> {
  constructor(identity: string) {
    if (!identity) {
      throw new Error('AccountStorage: identity is required');
    }

    super(`account:${identity}`);
  }
}

export { FPNumber };
export const api = {
  setStorage: () => undefined,
  shouldPairBeLocked: false as boolean,
};
export const connection = {} as Record<string, unknown>;
export const Operation = {
  AddLiquidity: 'AddLiquidity',
  CreatePair: 'CreatePair',
  CreateVault: 'CreateVault',
  SwapAndSend: 'SwapAndSend',
  Transfer: 'Transfer',
  VestedTransfer: 'VestedTransfer',
  XorEvmTransfer: 'XorEvmTransfer',
  SwapTransferBatch: 'SwapTransferBatch',
  Mint: 'Mint',
  BorrowVaultDebt: 'BorrowVaultDebt',
  RepayVaultDebt: 'RepayVaultDebt',
  RegisterAsset: 'RegisterAsset',
};
export const TransactionStatus = {
  Finalized: 'Finalized',
  Pending: 'Pending',
  Failed: 'Failed',
  InBlock: 'InBlock',
  Error: 'Error',
};
export const KUSD = { address: '0xKUSD' } as Record<string, string>;
export const KGOLD = { address: '0xKGOLD' } as Record<string, string>;
export const KXOR = { address: '0xKXOR' } as Record<string, string>;
export const isEthOperation = () => false;
export const isEvmOperation = () => false;
export const isSubstrateOperation = () => false;
export type IBridgeTransaction = any;

export const axiosInstance = {
  defaults: {
    headers: { common: {} as Record<string, string> },
    timeout: 0,
    baseURL: '',
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

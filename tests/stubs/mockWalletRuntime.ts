import * as walletStub from '@tests/stubs/walletRuntime';

type WalletStubModule = typeof import('@tests/stubs/walletRuntime');

type WalletOverride = Partial<WalletStubModule>;

const normalizeModule = <T extends Record<string, unknown> | undefined>(module: T): Record<string, unknown> => {
  if (!module) return {};

  const normalized = { ...module };

  if (Reflect.has(module, 'default')) {
    normalized.default = Reflect.get(module, 'default');
  }

  return normalized;
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

export const mergeDeep = <T>(base: T, override: unknown): T => {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override ?? base) as T;
  }

  const merged = { ...base } as Record<string, unknown>;

  Object.entries(override).forEach(([key, value]) => {
    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value) ? mergeDeep(current, value) : value;
  });

  return merged as T;
};

export const applyOverrides = (
  base: WalletStubModule,
  overrides: WalletOverride = {}
): WalletStubModule & { default: WalletStubModule['default'] } => {
  const normalizedBase = normalizeModule(base);
  const normalizedOverrides = normalizeModule(overrides);
  const defaultExport = normalizedBase.default ?? normalizedBase;

  const merged = mergeDeep(normalizedBase, normalizedOverrides) as WalletStubModule & {
    default: WalletStubModule['default'];
  };

  merged.default = mergeDeep(defaultExport, normalizedOverrides) as WalletStubModule['default'];

  return merged;
};

export const mockWalletRuntime = (overrides: WalletOverride = {}) => {
  return applyOverrides(walletStub, overrides);
};

export const withWalletRuntime = <T extends WalletStubModule, O extends WalletOverride>(
  wallet: T,
  overrides: O
): T & O => {
  const merged = applyOverrides(wallet, overrides);
  Object.assign(wallet, merged);
  return wallet as T & O;
};

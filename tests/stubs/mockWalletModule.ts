import { vi } from 'vitest';

type WalletStubModule = typeof import('@tests/stubs/@wallet');

type WalletOverride = Partial<WalletStubModule>;

const applyOverrides = (
  base: WalletStubModule,
  overrides: WalletOverride = {}
): WalletStubModule & { default: WalletStubModule['default'] } => {
  const defaultExport = (base as { default?: WalletStubModule['default'] }).default ?? base;

  const merged = {
    ...base,
    ...overrides,
  } as WalletStubModule & { default: WalletStubModule['default'] };

  merged.default = {
    ...defaultExport,
    ...overrides,
  } as WalletStubModule['default'];

  return merged;
};

export const mockWalletModule = async (overrides: WalletOverride = {}) => {
  const walletStub = await vi.importActual<WalletStubModule>('@tests/stubs/@wallet');
  return applyOverrides(walletStub, overrides);
};

export const withWalletModule = <T extends WalletStubModule, O extends WalletOverride>(
  wallet: T,
  overrides: O
): T & O => {
  Object.assign(wallet, overrides);
  if (wallet.default && typeof wallet.default === 'object') {
    Object.assign(wallet.default as Record<string, unknown>, overrides);
  }
  return wallet as T & O;
};

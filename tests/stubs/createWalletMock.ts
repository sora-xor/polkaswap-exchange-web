import { mockWalletModule, withWalletModule } from './mockWalletModule';

export type WalletMockOverrides = Parameters<typeof mockWalletModule>[0];

export function createWalletMock(overrides: WalletMockOverrides = {}) {
  return mockWalletModule(overrides);
}

export const withWalletMock = withWalletModule;

export const walletModuleFactory =
  (overrides: WalletMockOverrides = {}) =>
  () =>
    mockWalletModule(overrides);

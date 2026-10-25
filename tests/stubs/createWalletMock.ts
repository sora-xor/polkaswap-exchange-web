import { mockWalletRuntime, withWalletRuntime } from './mockWalletRuntime';

export type WalletMockOverrides = Parameters<typeof mockWalletRuntime>[0];

export function createWalletMock(overrides: WalletMockOverrides = {}) {
  return mockWalletRuntime(overrides);
}

export const withWalletMock = withWalletRuntime;

export const walletRuntimeFactory =
  (overrides: WalletMockOverrides = {}) =>
  () =>
    mockWalletRuntime(overrides);

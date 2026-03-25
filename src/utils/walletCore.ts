import type * as WalletCoreModule from '@/shims/wallet-core';

let walletCorePromise: Promise<WalletCoreModule> | null = null;
let walletCoreModule: WalletCoreModule | null = null;

export const loadWalletCore = async (): Promise<WalletCoreModule> => {
  if (!walletCorePromise) {
    walletCorePromise = import('@/shims/wallet-core').then((module) => {
      walletCoreModule = module;
      return module;
    });
  }

  return walletCorePromise;
};

export const getWalletCore = (): WalletCoreModule => {
  if (!walletCoreModule) {
    throw new Error('Wallet core not loaded yet. Call loadWalletCore() before accessing it.');
  }

  return walletCoreModule;
};

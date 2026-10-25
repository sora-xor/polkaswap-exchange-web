import type { WalletStore } from './index';

let walletStoreInstance: WalletStore | null = null;

export const setWalletStore = (store: WalletStore): void => {
  walletStoreInstance = store;
};

export const getWalletStore = (): WalletStore => {
  if (!walletStoreInstance) {
    throw new Error('Wallet store has not been initialised.');
  }

  return walletStoreInstance;
};

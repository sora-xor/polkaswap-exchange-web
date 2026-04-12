/**
 * Runtime helpers for WalletConnect-backed wallets. They take care of
 * registering per-chain wallet instances and adapting them to the shared
 * wallet abstraction used by the rest of the app.
 */
import { api } from '../../api';
import { AppWallet, TranslationConsts } from '../../consts';
import { addWalletLocally, checkWallet } from '../../services/wallet';

import { getWalletConnectProjectId } from './config';
import { WcProvider } from './provider/base';
import { WcSubProvider } from './provider/substrate';
import { WcWallet } from './wallet';

import type { Wallet } from '../wallet/types';
import type { WithKeyring } from '@sora-substrate/sdk';

export { WcProvider };

/** Tells whether a wallet entry represents a WalletConnect session. */
export const isWcWallet = (wallet: Wallet): boolean => {
  return wallet.extensionName.startsWith(AppWallet.WalletConnect);
};

/**
 * Registers a WalletConnect provider under a synthetic extension key so the
 * wallet infrastructure can treat WC sessions like native extensions.
 */
const addWcWalletLocally = (
  chainId: string | number,
  onDisconnect: (source: string) => void,
  Provider: typeof WcProvider,
  isSingletone = false
): string => {
  const dAppName = TranslationConsts.Polkaswap;
  const walletName = !isSingletone && chainId ? `${AppWallet.WalletConnect}:${chainId}` : AppWallet.WalletConnect;

  try {
    checkWallet(walletName);
  } catch {
    const provider = new Provider({
      chains: [chainId],
      onDisconnect: () => onDisconnect(walletName),
    });
    const wallet = new WcWallet(provider);

    addWalletLocally(wallet, AppWallet.WalletConnect, dAppName, walletName);
  }

  return walletName;
};

/**
 * Ensures there is a WalletConnect entry for the provided chain API and
 * registers a disconnect handler that can clean up Vuex state.
 */
export const addWcSubWalletLocally = (chainApi: WithKeyring, onDisconnect: (source: string) => void): string => {
  if (!getWalletConnectProjectId()) return '';

  const isSingletone = api === chainApi; // SORA wc wallet
  const chainGenesisHash = chainApi.api?.genesisHash?.toString?.();

  if (chainGenesisHash) {
    return addWcWalletLocally(chainGenesisHash, onDisconnect, WcSubProvider, isSingletone);
  } else {
    return '';
  }
};

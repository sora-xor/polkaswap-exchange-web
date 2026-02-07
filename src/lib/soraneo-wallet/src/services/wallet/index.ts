import { AppWallet } from '../../consts';
import { AppError, waitForDocumentReady } from '../../util';

import {
  KnownWallets,
  PredefinedWallets,
  AppStorageWallets,
  DesktopWallets,
  InternalWallets,
  ExtensionWallets,
} from './consts';
import { BaseDotSamaWallet } from './wallet';

import type { WalletInfo, Wallet } from './types';
import type { InjectedWindow, InjectedWindowProvider } from '@polkadot/extension-inject/types';

declare global {
  interface Window extends InjectedWindow {}
}

/**
 * In-memory registry of wallets detected or added at runtime. The list is
 * deliberately process-wide so all modules share the same wallet metadata.
 */
const walletList: BaseDotSamaWallet[] = [];

/**
 * Adds a wallet definition to the shared registry so it can be surfaced in
 * UI pickers and used as a signer source.
 */
export function addWallet(data: WalletInfo, dAppName: string): void {
  const wallet = new BaseDotSamaWallet(data, dAppName);
  walletList.push(wallet);
}

/**
 * Ensures that the requested wallet is known and throws a localized error if
 * the extension metadata is missing.
 */
export function checkWallet(extensionName: string): Wallet {
  const wallet = getWalletBySource(extensionName);

  if (!wallet) {
    // we haven't wallet data, so extension key used in translation
    throw new AppError({ key: 'polkadotjs.noExtension', payload: { extension: extensionName } });
  }

  return wallet;
}

export function getWallets(): BaseDotSamaWallet[] {
  return walletList;
}

/**
 * Resolves the wallet descriptor by its extension source key.
 */
export function getWalletBySource(source: string): BaseDotSamaWallet | undefined {
  return getWallets().find((wallet) => {
    return wallet.extensionName === source;
  });
}

/**
 * Derives friendly metadata for unknown wallets so they can still be rendered
 * in the UI when the extension injects a new source key.
 */
export function getWalletInfo(extensionName: string): WalletInfo {
  if (extensionName in KnownWallets) return KnownWallets[extensionName];

  const title = extensionName
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  return {
    extensionName,
    title,
    chromeUrl: '',
    mozillaUrl: '',
    logo: {
      src: '',
      alt: extensionName,
    },
  };
}

const initializeWalletsByKeys = (extensionNames: string[], dAppName: string): void => {
  extensionNames.forEach((extensionName) => {
    try {
      checkWallet(extensionName);
    } catch {
      addWallet(getWalletInfo(extensionName), dAppName);
    }
  });
};

/**
 * Detects all known and injected wallets, adding them to the registry while
 * preserving existing instances for already-registered extensions.
 */
export const initializeWallets = (dAppName: string): void => {
  const injected = window.injectedWeb3 || {};
  window.injectedWeb3 = injected;

  const extensionNames = [...PredefinedWallets, ...Object.keys(injected)];

  initializeWalletsByKeys(extensionNames, dAppName);
};

/**
 * Injects an ad-hoc wallet implementation into the browser global and
 * registers it if it was not already present.
 */
export const addWalletLocally = (
  wallet: InjectedWindowProvider,
  walletKey: string,
  dAppName: string,
  walletNameOverride?: string
): void => {
  const walletInfo = getWalletInfo(walletKey);
  const extensionName = walletNameOverride ?? walletInfo.extensionName;

  window.injectedWeb3 = window.injectedWeb3 || {};
  window.injectedWeb3[extensionName] = wallet;

  if (!getWalletBySource(extensionName)) {
    addWallet({ ...walletInfo, extensionName }, dAppName);
    console.info(`[${dAppName}] Wallet added: "${extensionName}"`);
  }
};

const isWalletsSource = (source: AppWallet, wallets: AppWallet[]) =>
  !!wallets.find((walletName) => source.startsWith(walletName));

/** Distinguishes wallets backed by the in-app storage implementation. */
export const isAppStorageSource = (source: AppWallet) => isWalletsSource(source, AppStorageWallets);

/** Tells whether the wallet originates from the desktop distribution. */
export const isDesktopSource = (source: AppWallet) => isWalletsSource(source, DesktopWallets);

export const isDesktopWallet = (wallet: Wallet) => isDesktopSource(wallet.extensionName as AppWallet);

/** Flags wallets maintained internally (no external extension backing). */
export const isInternalSource = (source: AppWallet) => isWalletsSource(source, InternalWallets);

export const isInternalWallet = (wallet: Wallet) => isInternalSource(wallet.extensionName as AppWallet);

export const isExtensionSource = (source: AppWallet) => isWalletsSource(source, ExtensionWallets);

/**
 * Returns the wallet list ready for rendering, optionally narrowed to desktop
 * entries and sorted to prioritize Fearless Wallet.
 */
export const getAppWallets = (isDesktop = false): Wallet[] => {
  try {
    const wallets = getWallets();
    const filtered = isDesktop ? wallets.filter((wallet) => isDesktopWallet(wallet)) : wallets;
    const sorted = [...filtered].sort((a, b) => {
      const aName = a.extensionName;
      const bName = b.extensionName;

      if (aName === AppWallet.FearlessWallet) {
        return -1;
      }
      if (bName === AppWallet.FearlessWallet) {
        return 1;
      }

      return aName.localeCompare(bName);
    });

    return sorted;
  } catch (error) {
    throw new AppError({ key: 'polkadotjs.noExtensions' });
  }
};

/**
 * Loads the wallet metadata, ensures the extension is installed, requests
 * access and validates that a signer interface is available.
 */
export const getWallet = async (extension = AppWallet.PolkadotJS): Promise<Wallet> => {
  const wallet = checkWallet(extension);

  if (!wallet.installed) {
    throw new AppError({ key: 'polkadotjs.noExtension', payload: { extension: wallet.title } });
  }

  await waitForDocumentReady();

  try {
    await wallet.enable();
  } catch {
    // external wallets
    throw new AppError({ key: 'polkadotjs.noSigner', payload: { extension: wallet.title } });
  }

  const hasExtension = !!wallet.extension;
  const hasSigner = typeof wallet.signer === 'object';

  if (hasExtension && hasSigner) return wallet;
  // google & wc
  throw new AppError({ key: 'polkadotjs.connectionError', payload: { extension: wallet.title } });
};

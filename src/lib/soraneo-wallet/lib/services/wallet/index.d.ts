import { AppWallet } from '../../consts';
import { BaseDotSamaWallet } from './wallet';
import { WalletInfo, Wallet } from './types';
import { InjectedWindow, InjectedWindowProvider } from '@polkadot/extension-inject/types';

declare global {
  interface Window extends InjectedWindow {}
}
/**
 * Adds a wallet definition to the shared registry so it can be surfaced in
 * UI pickers and used as a signer source.
 */
export declare function addWallet(data: WalletInfo, dAppName: string): void;
/**
 * Ensures that the requested wallet is known and throws a localized error if
 * the extension metadata is missing.
 */
export declare function checkWallet(extensionName: string): Wallet;
export declare function getWallets(): BaseDotSamaWallet[];
/**
 * Resolves the wallet descriptor by its extension source key.
 */
export declare function getWalletBySource(source: string): BaseDotSamaWallet | undefined;
/**
 * Derives friendly metadata for unknown wallets so they can still be rendered
 * in the UI when the extension injects a new source key.
 */
export declare function getWalletInfo(extensionName: string): WalletInfo;
/**
 * Detects all known and injected wallets, adding them to the registry while
 * preserving existing instances for already-registered extensions.
 */
export declare const initializeWallets: (dAppName: string) => void;
/**
 * Injects an ad-hoc wallet implementation into the browser global and
 * registers it if it was not already present.
 */
export declare const addWalletLocally: (
  wallet: InjectedWindowProvider,
  walletKey: string,
  dAppName: string,
  walletNameOverride?: string
) => void;
/** Distinguishes wallets backed by the in-app storage implementation. */
export declare const isAppStorageSource: (source: AppWallet) => boolean;
/** Tells whether the wallet originates from the desktop distribution. */
export declare const isDesktopSource: (source: AppWallet) => boolean;
export declare const isDesktopWallet: (wallet: Wallet) => boolean;
/** Flags wallets maintained internally (no external extension backing). */
export declare const isInternalSource: (source: AppWallet) => boolean;
export declare const isInternalWallet: (wallet: Wallet) => boolean;
export declare const isExtensionSource: (source: AppWallet) => boolean;
/**
 * Returns the wallet list ready for rendering, optionally narrowed to desktop
 * entries and sorted to prioritize Fearless Wallet.
 */
export declare const getAppWallets: (isDesktop?: boolean) => Wallet[];
/**
 * Loads the wallet metadata, ensures the extension is installed, requests
 * access and validates that a signer interface is available.
 */
export declare const getWallet: (extension?: AppWallet) => Promise<Wallet>;

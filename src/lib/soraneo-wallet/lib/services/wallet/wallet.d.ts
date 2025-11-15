import { InjectedExtension, InjectedMetadata, InjectedProvider } from '@polkadot/extension-inject/types';
import { Signer } from '@polkadot/api/types';
import { SubscriptionFn, Wallet, WalletAccount, WalletInfo, WalletLogoProps } from './types';

/**
 * Base implementation for wallets that integrate through the polkadot.js
 * extension APIs. Concrete wallets only need to supply static metadata, while
 * this class encapsulates extension detection and account management.
 */
export declare class BaseDotSamaWallet implements Wallet {
  dAppName: string;
  extensionName: string;
  title: string;
  chromeUrl: string;
  mozillaUrl: string;
  installUrl: string;
  logo: WalletLogoProps;
  _extension: InjectedExtension | undefined;
  _signer: Signer | undefined;
  _metadata: InjectedMetadata | undefined;
  _provider: InjectedProvider | undefined;
  constructor({ extensionName, chromeUrl, mozillaUrl, logo, title }: WalletInfo, dAppName?: string);
  get extension(): InjectedExtension | undefined;
  get signer(): Signer | undefined;
  get metadata(): InjectedMetadata | undefined;
  get provider(): InjectedProvider | undefined;
  /**
   * Indicates whether the wallet extension is available in the user's
   * browser. The check mirrors the logic used by the polkadot.js extension.
   */
  get installed(): boolean;
  /**
   * Returns the raw injected extension object without applying any local
   * normalization. Consumers usually call {@link enable} instead.
   */
  get rawExtension(): import('@polkadot/extension-inject/types').InjectedWindowProvider;
  /**
   * Requests access to the extension and caches the normalized response so
   * subsequent calls do not re-trigger the permission prompt.
   */
  enable: () => Promise<void>;
  /**
   * Augments accounts returned by the extension with wallet specific helpers
   * so downstream code can rely on a consistent shape.
   */
  private generateWalletAccount;
  /**
   * Subscribes to account updates emitted by the extension. The callback is
   * invoked with the wallet enhanced accounts whenever changes occur.
   */
  subscribeAccounts: (callback: SubscriptionFn) => Promise<import('@polkadot/extension-inject/types').Unsubcall | null>;
  /**
   * Returns the current list of accounts by querying the extension on demand.
   * The accounts are wrapped with wallet helpers for downstream consumers.
   */
  getAccounts: () => Promise<WalletAccount[] | null>;
}

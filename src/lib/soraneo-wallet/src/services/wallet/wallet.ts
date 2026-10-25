import {
  InjectedAccount,
  InjectedExtension,
  InjectedMetadata,
  InjectedProvider,
  InjectedWindow,
} from '@polkadot/extension-inject/types';
import type { Signer } from '@polkadot/api/types';

import { SubscriptionFn, Wallet, WalletAccount, WalletInfo, WalletLogoProps } from './types';

/**
 * Base implementation for wallets that integrate through the polkadot.js
 * extension APIs. Concrete wallets only need to supply static metadata, while
 * this class encapsulates extension detection and account management.
 */
export class BaseDotSamaWallet implements Wallet {
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
  private enablePromise: Promise<void> | null = null;

  constructor({ extensionName, chromeUrl, mozillaUrl, logo, title }: WalletInfo, dAppName = 'dApp Connect') {
    this.extensionName = extensionName;
    this.title = title;
    this.chromeUrl = chromeUrl;
    this.mozillaUrl = mozillaUrl;
    this.installUrl = /firefox|fxios/i.test(navigator.userAgent) ? mozillaUrl : chromeUrl;
    this.logo = logo;

    this.dAppName = dAppName;
  }

  // API docs: https://polkadot.js.org/docs/extension/
  get extension() {
    return this._extension;
  }

  // API docs: https://polkadot.js.org/docs/extension/
  get signer() {
    return this._signer;
  }

  get metadata() {
    return this._metadata;
  }

  get provider() {
    return this._provider;
  }

  /**
   * Indicates whether the wallet extension is available in the user's
   * browser. The check mirrors the logic used by the polkadot.js extension.
   */
  get installed() {
    const injectedWindow = window as Window & InjectedWindow;
    const injectedExtension = injectedWindow?.injectedWeb3?.[this.extensionName];

    return !!injectedExtension;
  }

  /**
   * Returns the raw injected extension object without applying any local
   * normalization. Consumers usually call {@link enable} instead.
   */
  get rawExtension() {
    const injectedWindow = window as Window & InjectedWindow;

    return injectedWindow?.injectedWeb3?.[this.extensionName];
  }

  private enableOnce = async (): Promise<void> => {
    if (!this.installed) {
      return;
    }

    const injectedExtension = this.rawExtension;

    if (!injectedExtension?.enable) {
      return;
    }

    const rawExtension = await injectedExtension.enable(this.dAppName);

    if (!rawExtension) {
      return;
    }

    const extension: InjectedExtension = {
      ...rawExtension,
      // Manually add `InjectedExtensionInfo` so as to have a consistent response.
      name: this.extensionName,
      version: injectedExtension.version ?? 'unknown',
    };

    this._extension = extension;
    this._signer = extension?.signer as unknown as Signer;
    this._metadata = extension?.metadata;
    this._provider = extension?.provider;
  };

  /**
   * Requests access to the extension and caches the normalized response so
   * concurrent and subsequent calls do not re-trigger provider setup.
   */
  enable = async (): Promise<void> => {
    if (this._extension) {
      return;
    }

    this.enablePromise ??= this.enableOnce().finally(() => {
      this.enablePromise = null;
    });

    await this.enablePromise;
  };

  /**
   * Augments accounts returned by the extension with wallet specific helpers
   * so downstream code can rely on a consistent shape.
   */
  private generateWalletAccount = (account: InjectedAccount): WalletAccount => {
    return {
      ...account,
      source: this._extension?.name as string,
      // Added extra fields here for convenience
      wallet: this,
      signer: this._extension?.signer as unknown as Signer,
    } as WalletAccount;
  };

  /**
   * Subscribes to account updates emitted by the extension. The callback is
   * invoked with the wallet enhanced accounts whenever changes occur.
   */
  subscribeAccounts = async (callback: SubscriptionFn) => {
    if (!this._extension) {
      await this?.enable();
    }

    if (!this._extension) {
      callback(undefined);

      return null;
    }

    return this._extension.accounts.subscribe((accounts: InjectedAccount[]) => {
      const accountsWithWallet = accounts.map(this.generateWalletAccount);

      callback(accountsWithWallet);
    });
  };

  /**
   * Returns the current list of accounts by querying the extension on demand.
   * The accounts are wrapped with wallet helpers for downstream consumers.
   */
  getAccounts = async () => {
    if (!this._extension) {
      await this?.enable();
    }

    if (!this._extension) {
      return null;
    }

    const accounts = await this._extension.accounts.get();

    return accounts.map(this.generateWalletAccount);
  };
}

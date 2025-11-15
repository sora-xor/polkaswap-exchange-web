import type {
  InjectedExtension,
  InjectedMetadata,
  InjectedProvider,
  Unsubcall,
} from '@polkadot/extension-inject/types';
import type { Signer } from '@polkadot/types/types';

export interface WalletLogoProps {
  src: string;
  alt: string;
}

export interface WalletInfo {
  extensionName: string;
  title: string;
  /** Chrome store URL */
  chromeUrl: string;
  /** Mozilla store URL */
  mozillaUrl: string;
  /** Store URL. It depends on user's browser */
  installUrl?: string;
  logo: WalletLogoProps;
}

export interface WalletAccount {
  address: string;
  source: string;
  name?: string;
  wallet?: WalletInfo;
  signer?: unknown;
}

export declare type SubscriptionFn = (accounts: WalletAccount[] | undefined) => void | Promise<void>;

export interface WalletMethods {
  enable: () => Promise<unknown>;
  subscribeAccounts: (callback: SubscriptionFn) => Promise<Unsubcall | null>;
  getAccounts: () => Promise<WalletAccount[] | null>;
}

export interface Wallet extends WalletInfo, WalletMethods {
  installed: boolean | undefined;
  extension: InjectedExtension | undefined;
  signer: Signer | undefined;
  metadata: InjectedMetadata | undefined;
  provider: InjectedProvider | undefined;
}

import type { AppWallet } from '@/lib/soraneo-wallet/src/consts';
import type { FiatPriceObject } from '@/lib/soraneo-wallet/src/services/indexer/types';
import type { Wallet } from '@/lib/soraneo-wallet/src/services/wallet/types';
import type { Book, AddressKeyMapping, KeyringPair$Json } from '@/lib/soraneo-wallet/src/types/common';
import type {
  AccountAsset,
  Asset,
  Blacklist,
  UnlockPeriodDays,
  WhitelistArrayItem,
} from '@sora-substrate/sdk/build/assets/types';
import type { Subscription, Subject } from 'rxjs';

export type CreateAccountArgs = {
  seed: string;
  name: string;
  password: string;
  passwordConfirm?: string;
  saveAccount?: boolean;
  exportAccount?: boolean;
};

export type RestoreAccountArgs = {
  json: KeyringPair$Json;
  password: string;
};

export type AccountState = {
  address: string;
  name: string;
  source: AppWallet;
  isExternal: boolean;
  assets: Readonly<Asset[]>;
  assetsSubscription: Nullable<VoidFunction>;
  accountAssets: Array<AccountAsset>;
  /** True while account-specific asset balances are hydrating from the wallet SDK. */
  accountAssetsLoading: boolean;
  /** True after the first account-specific asset hydration attempt settles for the active account. */
  accountAssetsLoaded: boolean;
  alertSubject: Nullable<Subject<FiatPriceObject>>;
  accountAssetsSubscription: Nullable<Subscription>;
  book: Nullable<Book>;
  whitelistArray: Readonly<WhitelistArrayItem[]>;
  blacklistArray: Readonly<Blacklist>;
  fiatPriceObject: Readonly<FiatPriceObject>;
  fiatPriceSubscription: Nullable<VoidFunction>;
  availableWallets: Array<Wallet>;
  addressKeyMapping: AddressKeyMapping;
  addressPassphraseMapping: AddressKeyMapping;
  assetsToNotifyQueue: Array<WhitelistArrayItem>;
  isDesktop: boolean;
  accountPasswordTimer: Record<string, Nullable<NodeJS.Timeout>>;
  accountPasswordTimestamp: Record<string, Nullable<number>>;
  accountPasswordTimeout: number;
  pinnedAssets: string[];
  isMstAddressExist: boolean;
  isMST: boolean;
};

export type VestedTransferFeeParams = {
  asset: Asset | AccountAsset;
  amount: string;
  vestingPercent: number;
  unlockPeriodInDays: UnlockPeriodDays;
};

export type VestedTransferParams = VestedTransferFeeParams & { to: string; start: number; current: number };

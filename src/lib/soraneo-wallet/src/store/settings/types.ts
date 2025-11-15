import { IndexerType, Theme } from '../../consts';

import type { SoraNetwork, WalletPermissions, WalletAssetFilters } from '../../consts';
import type { Alert, ApiKeysObject, FilterOptions, IndexerState } from '../../types/common';
import type { Currency, CurrencyFields, FiatExchangeRateObject } from '../../types/currency';
import type { NetworkFeesObject } from '@sora-substrate/sdk';
import type { NFTStorage } from 'nft.storage';
import type { Subscription } from 'rxjs';

export type SettingsState = {
  apiKeys: ApiKeysObject;
  alerts: Array<Alert>;
  allowTopUpAlert: boolean;
  isWalletLoaded: boolean;
  indexerType: IndexerType;
  indexers: Record<IndexerType, IndexerState>;
  permissions: WalletPermissions;
  filters: WalletAssetFilters;
  allowFeePopup: boolean;
  soraNetwork: Nullable<SoraNetwork>;
  networkFees: NetworkFeesObject;
  shouldBalanceBeHidden: boolean;
  feeMultiplier: number;
  runtimeVersion: number;
  blockNumber: number;
  blockNumberSubscription: Nullable<Subscription>;
  feeMultiplierAndRuntimeSubscriptions: Nullable<Subscription>;
  nftStorage: Nullable<NFTStorage>;
  currency: Currency;
  currencies: Array<CurrencyFields>;
  fiatExchangeRateObject: FiatExchangeRateObject;
  exchangeRateUnsubFn: Nullable<VoidFunction>;
  assetsFilter: FilterOptions;
  isMSTAvailable: boolean;
  theme: Theme;
};

import { SoraNetwork, WalletAssetFilters, WalletPermissions, IndexerType, Theme } from '../../consts';
import { Alert, ApiKeysObject, ConnectionStatus, FilterOptions } from '../../types/common';
import { Currency, CurrencyFields, FiatExchangeRateObject } from '../../types/currency';
import { SettingsState } from './types';
import { NetworkFeesObject } from '@sora-substrate/sdk';
import { Subscription } from 'rxjs';

declare const mutations: {
  setIndexerType(state: SettingsState, indexerType: IndexerType): void;
  setIndexerStatus(
    state: SettingsState,
    {
      indexer,
      status,
    }: {
      indexer: IndexerType;
      status: ConnectionStatus;
    }
  ): void;
  setIndexerEndpoint(
    state: SettingsState,
    {
      indexer,
      endpoint,
    }: {
      indexer: IndexerType;
      endpoint: string;
    }
  ): void;
  setWalletLoaded(state: SettingsState, flag: boolean): void;
  setPermissions(state: SettingsState, permissions: WalletPermissions): void;
  setSoraNetwork(state: SettingsState, value: Nullable<SoraNetwork>): void;
  setNetworkFees(state: SettingsState, fees?: NetworkFeesObject): void;
  updateNetworkFees(state: SettingsState, fees?: any): void;
  toggleHideBalance(state: SettingsState): void;
  setFilterOptions(state: SettingsState, filters: WalletAssetFilters): void;
  setAllowFeePopup(state: SettingsState, flag: boolean): void;
  setFeeMultiplier(state: SettingsState, multiplier: number): void;
  setRuntimeVersion(state: SettingsState, version: number): void;
  setBlockNumber(state: SettingsState, blockNumber: number): void;
  setBlockNumberSubscription(state: SettingsState, subscription: Subscription): void;
  resetBlockNumberSubscription(state: SettingsState): void;
  setFeeMultiplierAndRuntimeSubscriptions(state: SettingsState, subscription: Subscription): void;
  resetFeeMultiplierAndRuntimeSubscriptions(state: SettingsState): void;
  setApiKeys(state: SettingsState, keys?: ApiKeysObject): void;
  setNftStorage(
    state: SettingsState,
    {
      marketplaceDid,
      ucan,
    }: {
      marketplaceDid?: string;
      ucan?: string;
    }
  ): void;
  setDepositNotifications(state: SettingsState, allow: boolean): void;
  addPriceAlert(state: SettingsState, alert: Alert): void;
  removePriceAlert(state: SettingsState, position: number): void;
  editPriceAlert(state: SettingsState, { alert, position }: any): void;
  setPriceAlertAsNotified(state: SettingsState, { position, value }: any): void;
  setFiatCurrency(state: SettingsState, currency?: Currency): void;
  setCurrencies(state: SettingsState, currencies: CurrencyFields[]): void;
  updateFiatExchangeRates(state: SettingsState, newRates?: FiatExchangeRateObject): void;
  setExchangeRateUnsubFn(state: SettingsState, unsubFn: VoidFunction): void;
  resetExchangeRateSubscription(state: SettingsState): void;
  setAssetsFilter(state: SettingsState, filter: FilterOptions): void;
  setIsMstAvailable(state: SettingsState, isAvailable: boolean): void;
  setTheme(state: SettingsState, theme: Theme): void;
};
export default mutations;

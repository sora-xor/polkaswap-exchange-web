import { defineStore } from 'pinia';

import { useRouterStore } from '@/stores/router';
import type { Nullable } from '@/types/common';
import type { Theme } from '@/consts/theme';
import { requireLegacyStore } from '@/utils/legacy-store';

import type { HistoryItem } from '@sora-substrate/sdk';
import type {
  AccountAsset,
  RegisteredAccountAsset,
  Whitelist,
  WhitelistArrayItem,
} from '@sora-substrate/sdk/build/assets/types';
import type { WALLET_TYPES } from '@wallet';
import type { WALLET_TYPES } from '@wallet/core';

type AssetsTable = Record<string, RegisteredAccountAsset>;
type AccountAssetsTable = Record<string, { balance: { transferable?: string } }>;
type FiatPriceObject = Record<string, string>;

const getLegacyStore = requireLegacyStore;

/**
 * Transitional Pinia facade over the legacy Vuex wallet module.
 * Enables gradual migration away from `store.state.wallet`/`store.getters.wallet`
 * access throughout the app while the underlying module remains Vuex-based.
 */
export const useWalletStore = defineStore('wallet', {
  getters: {
    address: () => getLegacyStore().state.wallet.account.address as string,
    soraAddress(): string {
      return this.address;
    },
    account(): Nullable<WALLET_TYPES.PolkadotJsAccount> {
      return getLegacyStore().getters.wallet.account.account as Nullable<WALLET_TYPES.PolkadotJsAccount>;
    },
    isLoggedIn(): boolean {
      return Boolean(getLegacyStore().getters.wallet.account.isLoggedIn);
    },
    whitelist(): Whitelist {
      return getLegacyStore().getters.wallet.account.whitelist as Whitelist;
    },
    whitelistIdsBySymbol(): WALLET_TYPES.WhitelistIdsBySymbol {
      return getLegacyStore().getters.wallet.account.whitelistIdsBySymbol as WALLET_TYPES.WhitelistIdsBySymbol;
    },
    assets(): AccountAsset[] {
      return getLegacyStore().state.wallet.account.assets as AccountAsset[];
    },
    accountAssets(): AccountAsset[] {
      return getLegacyStore().state.wallet.account.accountAssets as AccountAsset[];
    },
    isAssetPinned(): (asset: AccountAsset) => boolean {
      return getLegacyStore().getters.wallet.account.isAssetPinned as (asset: AccountAsset) => boolean;
    },
    fiatPriceObject(): FiatPriceObject {
      return (getLegacyStore().state.wallet.account.fiatPriceObject as FiatPriceObject) ?? {};
    },
    assetsDataTable(): AssetsTable {
      return getLegacyStore().getters.wallet.account.assetsDataTable as AssetsTable;
    },
    accountAssetsAddressTable(): AccountAssetsTable {
      return getLegacyStore().getters.wallet.account.accountAssetsAddressTable as AccountAssetsTable;
    },
    pinnedAssets(): string[] {
      return getLegacyStore().state.wallet.account.pinnedAssets as string[];
    },
    assetsToNotifyQueue(): string[] {
      return getLegacyStore().state.wallet.account.assetsToNotifyQueue as string[];
    },
    accountSource(): Nullable<WALLET_TYPES.AppWallet> {
      return getLegacyStore().state.wallet.account.source as Nullable<WALLET_TYPES.AppWallet>;
    },
    currentRoute(): Nullable<string> {
      const routerStore = useRouterStore();
      return routerStore.current;
    },
    isMstAccount(): boolean {
      return Boolean(getLegacyStore().state.wallet.account.isMST);
    },
    ceresFiatValuesUsage(): boolean {
      return Boolean(getLegacyStore().state.wallet.account.ceresFiatValuesUsage);
    },
    firstReadyTransaction(): Nullable<HistoryItem> {
      return getLegacyStore().getters.wallet.transactions.firstReadyTx as Nullable<HistoryItem>;
    },
    pendingMstTransactions(): HistoryItem[] {
      return getLegacyStore().state.wallet.transactions.pendingMstTransactions as HistoryItem[];
    },
    isSignTxDialogVisible(): boolean {
      return Boolean(getLegacyStore().state.wallet.transactions.isSignTxDialogVisible);
    },
    isSignTxDialogDisabled(): boolean {
      return Boolean(getLegacyStore().state.wallet.transactions.isSignTxDialogDisabled);
    },
    isConfirmTxDialogDisabled(): boolean {
      return Boolean(getLegacyStore().state.wallet.transactions.isConfirmTxDialogDisabled);
    },
    isMstWarningVisible(): boolean {
      return Boolean(getLegacyStore().state.wallet.settings.isMSTAvailable);
    },
    soraNetwork(): Nullable<string> {
      return getLegacyStore().state.wallet.settings.soraNetwork as Nullable<string>;
    },
  },
  actions: {
    toggleHideBalance(): void {
      getLegacyStore().commit.wallet.settings.toggleHideBalance();
    },
    setSignTxDialogVisibility(flag: boolean): void {
      getLegacyStore().commit.wallet.transactions.setSignTxDialogVisibility(flag);
    },
    navigate(payload: { name: string; params?: Record<string, unknown> }): void {
      const routerStore = useRouterStore();
      routerStore.navigate(payload);
    },
    async loginAccount(account: WALLET_TYPES.PolkadotJsAccount): Promise<void> {
      await getLegacyStore().dispatch.wallet.account.loginAccount(account);
    },
    logout(): Promise<void> {
      return getLegacyStore().dispatch.wallet.account.logout();
    },
    async renameAccount(payload: { address: string; name: string }): Promise<void> {
      await getLegacyStore().dispatch.wallet.account.renameAccount(payload);
    },
    async addAsset(address?: string): Promise<void> {
      await getLegacyStore().dispatch.wallet.account.addAsset(address);
    },
    async notifyOnDeposit(data: { asset: WhitelistArrayItem; message: string }): Promise<void> {
      await getLegacyStore().dispatch.wallet.account.notifyOnDeposit(data);
    },
    async afterLogin(): Promise<void> {
      await getLegacyStore().dispatch.wallet.account.afterLogin();
    },
    async setApiKeys(keys: Record<string, string>): Promise<void> {
      await getLegacyStore().dispatch.wallet.settings.setApiKeys(keys);
    },
    async subscribeOnExchangeRatesApi(): Promise<void> {
      await getLegacyStore().dispatch.wallet.settings.subscribeOnExchangeRatesApi();
    },
    async resetNetworkSubscriptions(): Promise<void> {
      await getLegacyStore().dispatch.wallet.subscriptions.resetNetworkSubscriptions();
    },
    async resetInternalSubscriptions(): Promise<void> {
      await getLegacyStore().dispatch.wallet.subscriptions.resetInternalSubscriptions();
    },
    async activateNetworkSubscriptions(): Promise<void> {
      await getLegacyStore().dispatch.wallet.subscriptions.activateNetwokSubscriptions();
    },
    async setTheme(theme: Theme): Promise<void> {
      await getLegacyStore().dispatch.wallet.settings.setTheme(theme);
    },
  },
});

export type WalletStore = ReturnType<typeof useWalletStore>;

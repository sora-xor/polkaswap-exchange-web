import { defineStore } from 'pinia';

import '@/store';

import { useRouterStore } from '@/stores/router';
import type { Nullable } from '@/types/common';
import type { Theme } from '@/consts/theme';
import { requireLegacyStore } from '@/utils/legacy-store';

import type { HistoryItem, NetworkFeesObject } from '@sora-substrate/sdk';
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

const getLegacyStore = () => {
  const legacyStore = requireLegacyStore();

  if (!legacyStore?.state?.wallet) {
    return null;
  }

  return legacyStore;
};

const accessLegacyStore = <T>(getter: (store: ReturnType<typeof requireLegacyStore>) => T, fallback: T): T => {
  const legacyStore = getLegacyStore();

  if (!legacyStore) {
    return fallback;
  }

  try {
    // Legacy Vuex getters may temporarily resolve to `undefined` during boot.
    // Preserve explicit falsy values (false/0/'') while falling back on nullish.
    return (getter(legacyStore) ?? fallback) as T;
  } catch (error) {
    return fallback;
  }
};

/**
 * Transitional Pinia facade over the legacy Vuex wallet module.
 * Enables gradual migration away from `store.state.wallet`/`store.getters.wallet`
 * access throughout the app while the underlying module remains Vuex-based.
 */
export const useWalletStore = defineStore('wallet', {
  getters: {
    address: () => accessLegacyStore((store) => store.state.wallet.account.address as string, ''),
    soraAddress(): string {
      return this.address;
    },
    account(): Nullable<WALLET_TYPES.PolkadotJsAccount> {
      return accessLegacyStore(
        (store) => store.getters.wallet.account.account as Nullable<WALLET_TYPES.PolkadotJsAccount>,
        null
      );
    },
    isLoggedIn(): boolean {
      return accessLegacyStore((store) => Boolean(store.getters.wallet.account.isLoggedIn), false);
    },
    whitelist(): Whitelist {
      return accessLegacyStore((store) => store.getters.wallet.account.whitelist as Whitelist, []);
    },
    whitelistIdsBySymbol(): WALLET_TYPES.WhitelistIdsBySymbol {
      return accessLegacyStore(
        (store) => store.getters.wallet.account.whitelistIdsBySymbol as WALLET_TYPES.WhitelistIdsBySymbol,
        {} as WALLET_TYPES.WhitelistIdsBySymbol
      );
    },
    assets(): AccountAsset[] {
      return accessLegacyStore((store) => store.state.wallet.account.assets as AccountAsset[], []);
    },
    accountAssets(): AccountAsset[] {
      return accessLegacyStore((store) => store.state.wallet.account.accountAssets as AccountAsset[], []);
    },
    isAssetPinned(): (asset: AccountAsset) => boolean {
      return accessLegacyStore(
        (store) => store.getters.wallet.account.isAssetPinned as (asset: AccountAsset) => boolean,
        () => false
      );
    },
    fiatPriceObject(): FiatPriceObject {
      return accessLegacyStore((store) => (store.state.wallet.account.fiatPriceObject as FiatPriceObject) ?? {}, {});
    },
    assetsDataTable(): AssetsTable {
      return accessLegacyStore((store) => store.getters.wallet.account.assetsDataTable as AssetsTable, {});
    },
    accountAssetsAddressTable(): AccountAssetsTable {
      return accessLegacyStore(
        (store) => store.getters.wallet.account.accountAssetsAddressTable as AccountAssetsTable,
        {}
      );
    },
    pinnedAssets(): string[] {
      return accessLegacyStore((store) => store.state.wallet.account.pinnedAssets as string[], []);
    },
    assetsToNotifyQueue(): string[] {
      return accessLegacyStore((store) => store.state.wallet.account.assetsToNotifyQueue as string[], []);
    },
    accountSource(): Nullable<WALLET_TYPES.AppWallet> {
      return accessLegacyStore((store) => store.state.wallet.account.source as Nullable<WALLET_TYPES.AppWallet>, null);
    },
    currentRoute(): Nullable<string> {
      const routerStore = useRouterStore();
      return routerStore.current;
    },
    isMstAccount(): boolean {
      return accessLegacyStore((store) => Boolean(store.state.wallet.account.isMST), false);
    },
    ceresFiatValuesUsage(): boolean {
      return accessLegacyStore((store) => Boolean(store.state.wallet.account.ceresFiatValuesUsage), false);
    },
    shouldBalanceBeHidden(): boolean {
      return accessLegacyStore((store) => Boolean(store.state.wallet.settings.shouldBalanceBeHidden), false);
    },
    currency(): Nullable<string> {
      return accessLegacyStore((store) => store.state.wallet.settings.currency as Nullable<string>, null);
    },
    currencySymbol(): string {
      return accessLegacyStore((store) => store.getters.wallet.settings.currencySymbol as string, '$');
    },
    exchangeRate(): number {
      return accessLegacyStore((store) => store.getters.wallet.settings.exchangeRate as number, 1);
    },
    networkFees(): NetworkFeesObject {
      return accessLegacyStore(
        (store) => store.state.wallet.settings.networkFees as NetworkFeesObject,
        {} as NetworkFeesObject
      );
    },
    firstReadyTransaction(): Nullable<HistoryItem> {
      return accessLegacyStore(
        (store) => store.getters.wallet.transactions.firstReadyTx as Nullable<HistoryItem>,
        null
      );
    },
    pendingMstTransactions(): HistoryItem[] {
      return accessLegacyStore((store) => store.state.wallet.transactions.pendingMstTransactions as HistoryItem[], []);
    },
    isSignTxDialogVisible(): boolean {
      return accessLegacyStore((store) => Boolean(store.state.wallet.transactions.isSignTxDialogVisible), false);
    },
    isSignTxDialogDisabled(): boolean {
      return accessLegacyStore((store) => Boolean(store.state.wallet.transactions.isSignTxDialogDisabled), false);
    },
    isConfirmTxDialogDisabled(): boolean {
      return accessLegacyStore((store) => Boolean(store.state.wallet.transactions.isConfirmTxDialogDisabled), false);
    },
    isMstWarningVisible(): boolean {
      return accessLegacyStore((store) => Boolean(store.state.wallet.settings.isMSTAvailable), false);
    },
    soraNetwork(): Nullable<string> {
      return accessLegacyStore((store) => store.state.wallet.settings.soraNetwork as Nullable<string>, null);
    },
  },
  actions: {
    toggleHideBalance(): void {
      getLegacyStore()?.commit?.wallet?.settings?.toggleHideBalance?.();
    },
    setSignTxDialogVisibility(flag: boolean): void {
      getLegacyStore()?.commit?.wallet?.transactions?.setSignTxDialogVisibility?.(flag);
    },
    navigate(payload: { name: string; params?: Record<string, unknown> }): void {
      const routerStore = useRouterStore();
      routerStore.navigate(payload);
    },
    async loginAccount(account: WALLET_TYPES.PolkadotJsAccount): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.account?.loginAccount?.(account);
    },
    logout(): Promise<void> {
      return getLegacyStore()?.dispatch?.wallet?.account?.logout?.() ?? Promise.resolve();
    },
    async renameAccount(payload: { address: string; name: string }): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.account?.renameAccount?.(payload);
    },
    async addAsset(address?: string): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.account?.addAsset?.(address);
    },
    async notifyOnDeposit(data: { asset: WhitelistArrayItem; message: string }): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.account?.notifyOnDeposit?.(data);
    },
    async afterLogin(): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.account?.afterLogin?.();
    },
    async setApiKeys(keys: Record<string, string>): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.settings?.setApiKeys?.(keys);
    },
    async subscribeOnExchangeRatesApi(): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.settings?.subscribeOnExchangeRatesApi?.();
    },
    addActiveTransaction(id: string): void {
      const transactions = getLegacyStore()?.commit?.wallet?.transactions;

      if (!transactions?.addActiveTx) {
        console.warn('[wallet] Legacy transactions module is not ready yet.');
        return;
      }

      transactions.addActiveTx(id);
    },
    removeActiveTransactions(ids: string[]): void {
      const transactions = getLegacyStore()?.commit?.wallet?.transactions;

      if (!transactions?.removeActiveTxs) {
        console.warn('[wallet] Legacy transactions module is not ready yet.');
        return;
      }

      transactions.removeActiveTxs(ids);
    },
    async resetNetworkSubscriptions(): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.subscriptions?.resetNetworkSubscriptions?.();
    },
    async resetInternalSubscriptions(): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.subscriptions?.resetInternalSubscriptions?.();
    },
    async activateNetworkSubscriptions(): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.subscriptions?.activateNetwokSubscriptions?.();
    },
    async setTheme(theme: Theme): Promise<void> {
      await getLegacyStore()?.dispatch?.wallet?.settings?.setTheme?.(theme);
    },
  },
});

export type WalletStore = ReturnType<typeof useWalletStore>;

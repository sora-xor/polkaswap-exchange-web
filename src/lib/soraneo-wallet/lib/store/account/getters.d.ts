import { AccountState } from './types';
import { AssetsTable, AccountAssetsTable, PolkadotJsAccount } from '../../types/common';
import { Whitelist, AccountAsset } from '@sora-substrate/sdk/build/assets/types';

declare const getters: {
  isLoggedIn(state: AccountState, getters: any, rootState: any, rootGetters: any): boolean;
  account(state: AccountState, getters: any, rootState: any, rootGetters: any): PolkadotJsAccount;
  assetsDataTable(state: AccountState, getters: any, rootState: any, rootGetters: any): AssetsTable;
  accountAssetsAddressTable(state: AccountState, getters: any, rootState: any, rootGetters: any): AccountAssetsTable;
  whitelist(state: AccountState, getters: any, rootState: any, rootGetters: any): Whitelist;
  pinnedAssets(state: AccountState, getters: any, rootState: any, rootGetters: any): Array<AccountAsset>;
  isAssetPinned(state: AccountState, getters: any, rootState: any, rootGetters: any): (asset: AccountAsset) => boolean;
  whitelistIdsBySymbol(state: AccountState, getters: any, rootState: any, rootGetters: any): any;
  getPassword(
    state: AccountState,
    getters: any,
    rootState: any,
    rootGetters: any
  ): (address: string) => Nullable<string>;
  blacklist(state: AccountState, getters: any, rootState: any, rootGetters: any): any;
  isConnectedAccount(
    state: AccountState,
    getters: any,
    rootState: any,
    rootGetters: any
  ): (account: PolkadotJsAccount) => boolean;
};
export default getters;

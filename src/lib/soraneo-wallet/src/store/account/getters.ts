import { AES, enc } from 'crypto-js';
import { defineGetters } from 'direct-vuex';
import isEqual from 'lodash/fp/isEqual';

import { api } from '../../api';
import { AppWallet } from '../../consts';
import { formatAccountAddress } from '../../util';

import { accountGetterContext } from './../account';

import type { AccountState } from './types';
import type { AssetsTable, AccountAssetsTable, PolkadotJsAccount } from '../../types/common';
import type { Asset, Whitelist, AccountAsset, WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

const toHashTable = <T extends Asset>(list: Readonly<Array<T>>, key: string) => {
  return list.reduce((result, item) => {
    if (!(key in item)) return result;

    return { ...result, [item[key]]: item };
  }, {});
};

const getters = defineGetters<AccountState>()({
  isLoggedIn(...args): boolean {
    const { state } = accountGetterContext(args);
    return !!state.address && !!state.source;
  },
  account(...args): PolkadotJsAccount {
    const { state } = accountGetterContext(args);
    return {
      address: state.address,
      name: state.name,
      source: state.source as AppWallet,
    };
  },
  assetsDataTable(...args): AssetsTable {
    const { state } = accountGetterContext(args);
    return toHashTable(state.assets, 'address');
  },
  accountAssetsAddressTable(...args): AccountAssetsTable {
    const { state } = accountGetterContext(args);
    return toHashTable(state.accountAssets, 'address');
  },
  whitelist(...args): Whitelist {
    const { state } = accountGetterContext(args);
    return state.whitelistArray && state.whitelistArray.length
      ? api.assets.getWhitelist(state.whitelistArray as WhitelistArrayItem[])
      : {};
  },
  pinnedAssets(...args): Array<AccountAsset> {
    const { state } = accountGetterContext(args);
    return state.pinnedAssets
      .map((pinnedAddress) => state.accountAssets.find((asset) => asset.address === pinnedAddress))
      .filter((asset) => asset !== undefined) as Array<AccountAsset>;
  },
  isAssetPinned(...args): (asset: AccountAsset) => boolean {
    const { state } = accountGetterContext(args);
    return (asset: AccountAsset): boolean => {
      const pinnedAssetsAddresses = state.pinnedAssets;
      return pinnedAssetsAddresses.includes(asset.address);
    };
  },

  whitelistIdsBySymbol(...args): any {
    const { state } = accountGetterContext(args);
    return state.whitelistArray && state.whitelistArray.length
      ? api.assets.getWhitelistIdsBySymbol(state.whitelistArray as WhitelistArrayItem[])
      : {};
  },
  getPassword(...args): (address: string) => Nullable<string> {
    const { state } = accountGetterContext(args);

    return (accountAddress: string) => {
      if (!accountAddress) return null;

      const address = api.formatAddress(accountAddress, false);
      const encryptedPassphrase = state.addressPassphraseMapping[address];
      const sessionKey = state.addressKeyMapping[address];

      if (!(encryptedPassphrase && sessionKey)) return null;

      const decoded = AES.decrypt(encryptedPassphrase, sessionKey).toString(enc.Utf8);
      return decoded;
    };
  },
  blacklist(...args): any {
    const { state } = accountGetterContext(args);
    return state.blacklistArray && state.blacklistArray.length ? state.blacklistArray : [];
  },
  isConnectedAccount(...args) {
    const { state } = accountGetterContext(args);

    return (account: PolkadotJsAccount): boolean => {
      const { address, name, source } = state;
      const formatted = { ...account, address: formatAccountAddress(account.address) };
      const accountData: PolkadotJsAccount = { address, name, source };

      return isEqual(formatted)(accountData);
    };
  },
});

export default getters;

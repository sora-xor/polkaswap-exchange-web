import { defineGetters } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

import { assetsGetterContext } from '@/store/assets';
import { rootGetterContext } from '@/store';
import { findAssetInCollection } from '@/utils';
import type { AssetsState, RegisteredAccountAssetObject, RegisteredAccountAssetWithDecimals } from './types';

const getters = defineGetters<AssetsState>()({
  whitelistAssets(...args): Array<Asset> {
    const [state, getters] = args;
    const { rootState, rootGetters } = rootGetterContext([state, getters]);
    return rootState.wallet.account.assets.filter((asset: Asset) =>
      api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist)
    );
  },
  nonWhitelistAssets(...args): Array<Asset> {
    const [state, getters] = args;
    const { rootState, rootGetters } = rootGetterContext([state, getters]);
    return rootState.wallet.account.assets.filter(
      (asset: Asset) => !api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist)
    );
  },
  nonWhitelistDivisibleAssets(...args): Array<Asset> {
    const [state, getters] = args;
    const { rootState, rootGetters } = rootGetterContext([state, getters]);
    return rootState.wallet.account.assets.filter(
      (asset: Asset) => !api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist) && asset.decimals
    );
  },
  nonWhitelistAccountAssets(...args): Array<AccountAsset> {
    const [state, getters] = args;
    const { rootState, rootGetters } = rootGetterContext([state, getters]);
    return rootState.wallet.account.accountAssets.filter(
      (asset: AccountAsset) => !api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist)
    );
  },
  nonWhitelistDivisibleAccountAssets(...args): Array<AccountAsset> {
    const [state, getters] = args;
    const { rootState, rootGetters } = rootGetterContext([state, getters]);
    return rootState.wallet.account.accountAssets.filter(
      (asset: AccountAsset) => !api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist) && asset.decimals
    );
  },
  assetsDataTable(...args): RegisteredAccountAssetObject {
    const [stateArg, gettersArg] = args;
    const { state } = assetsGetterContext(args);
    const { rootState, rootGetters } = rootGetterContext([stateArg, gettersArg]);
    const { accountAssetsAddressTable } = rootGetters.wallet.account;
    const { assets } = rootState.wallet.account;
    const { registeredAssets } = state;

    return assets.reduce<RegisteredAccountAssetObject>((result, asset: Asset) => {
      const { externalAddress, externalBalance, externalDecimals } =
        findAssetInCollection(asset, registeredAssets) || {};
      const { balance } = accountAssetsAddressTable[asset.address] || {};

      const item = {
        ...asset,
        balance,
        externalAddress,
        externalBalance,
        externalDecimals,
      };

      return {
        ...result,
        [asset.address]: item,
      };
    }, {});
  },
  assetDataByAddress(...args): (address?: Nullable<string>) => Nullable<RegisteredAccountAssetWithDecimals> {
    const { getters } = assetsGetterContext(args);
    return (address?: Nullable<string>): Nullable<RegisteredAccountAssetWithDecimals> => {
      if (!address) return undefined;

      return getters.assetsDataTable[address];
    };
  },
  xor(...args): RegisteredAccountAssetWithDecimals {
    const [stateArg, gettersArg] = args;
    const { rootState } = rootGetterContext([stateArg, gettersArg]);
    const { getters } = assetsGetterContext(args);
    // XOR asset cannot be nullable
    return getters.assetDataByAddress(XOR.address) as RegisteredAccountAssetWithDecimals;
  },
});

export default getters;

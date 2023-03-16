import { defineGetters } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

import { assetsGetterContext } from '@/store/assets';
import { findAssetInCollection } from '@/utils';
import type { AssetsState, RegisteredAccountAssetWithDecimals } from './types';

const getters = defineGetters<AssetsState>()({
  whitelistAssets(...args): Array<Asset> {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.assets.filter((asset: Asset) =>
      api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist)
    );
  },
  nonWhitelistDivisibleAssets(...args): Record<string, Asset> {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.assets.reduce((buffer, asset: Asset) => {
      if (!api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist) && asset.decimals) {
        buffer[asset.address] = asset;
      }
      return buffer;
    }, {});
  },
  nonWhitelistDivisibleAccountAssets(...args): Record<string, AccountAsset> {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.accountAssets.reduce((buffer, asset: AccountAsset) => {
      if (!api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist) && asset.decimals) {
        buffer[asset.address] = asset;
      }
      return buffer;
    }, {});
  },
  assetsDataTable(...args): Record<string, Asset> {
    const { rootState } = assetsGetterContext(args);

    return rootState.wallet.account.assets.reduce((result, asset) => {
      return {
        ...result,
        [asset.address]: asset,
      };
    }, {});
  },
  assetDataByAddress(...args): (address?: Nullable<string>) => Nullable<RegisteredAccountAssetWithDecimals> {
    const { getters, state, rootGetters } = assetsGetterContext(args);

    return (address?: Nullable<string>): Nullable<RegisteredAccountAssetWithDecimals> => {
      if (!address) return undefined;

      const asset = getters.assetsDataTable[address];

      if (!asset) return null;

      const { externalAddress, externalBalance, externalDecimals } =
        findAssetInCollection(asset, state.registeredAssets) || {};

      const { balance } = rootGetters.wallet.account.accountAssetsAddressTable[asset.address] || {};

      return {
        ...asset,
        balance,
        externalAddress,
        externalBalance,
        externalDecimals,
      };
    };
  },
  xor(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { getters } = assetsGetterContext(args);
    return getters.assetDataByAddress(XOR.address);
  },
});

export default getters;

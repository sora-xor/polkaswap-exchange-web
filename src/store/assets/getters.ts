import { defineGetters } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

import { assetsGetterContext } from '@/store/assets';
import type { AssetsState, RegisteredAccountAssetObject, RegisteredAccountAssetWithDecimals } from './types';

const getters = defineGetters<AssetsState>()({
  whitelistAssets(...args): Array<Asset> {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.assets.filter((asset: Asset) =>
      api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist)
    );
  },
  nonWhitelistDivisibleAssets(...args): { [key: string]: Asset } {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.assets.reduce((buffer, asset: Asset) => {
      if (!api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist) && asset.decimals) {
        buffer[asset.address] = asset;
      }
      return buffer;
    }, {});
  },
  nonWhitelistDivisibleAccountAssets(...args): { [key: string]: AccountAsset } {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.accountAssets.reduce((buffer, asset: AccountAsset) => {
      if (!api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist) && asset.decimals) {
        buffer[asset.address] = asset;
      }
      return buffer;
    }, {});
  },
  assetsDataTable(...args): RegisteredAccountAssetObject {
    const { state, rootState, rootGetters } = assetsGetterContext(args);
    const { accountAssetsAddressTable } = rootGetters.wallet.account;
    const { assets } = rootState.wallet.account;
    const { registeredAssets } = state;

    return assets.reduce<RegisteredAccountAssetObject>((result, asset: Asset) => {
      const {
        address: externalAddress,
        balance: externalBalance,
        decimals: externalDecimals,
      } = registeredAssets[asset.address] || {};
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
  xor(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { getters } = assetsGetterContext(args);
    return getters.assetDataByAddress(XOR.address);
  },
});

export default getters;

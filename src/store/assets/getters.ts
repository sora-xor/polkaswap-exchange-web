import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { assetsGetterContext } from '@/store/assets';

import type { AssetsState } from './types';
import type { Asset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<AssetsState>()({
  whitelistAssets(...args): Array<Asset> {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.assets.filter((asset: Asset) =>
      api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist)
    );
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
  assetDataByAddress(...args): (address?: Nullable<string>) => Nullable<RegisteredAccountAsset> {
    const { getters, state, rootGetters } = assetsGetterContext(args);

    return (address?: Nullable<string>): Nullable<RegisteredAccountAsset> => {
      if (!address) return undefined;

      const asset = getters.assetsDataTable[address];

      if (!asset) return null;

      const { address: externalAddress, decimals: externalDecimals } = state.registeredAssets[asset.address] || {};

      const { balance } = rootGetters.wallet.account.accountAssetsAddressTable[asset.address] || {};

      return {
        ...asset,
        balance,
        externalAddress,
        externalBalance: ZeroStringValue, // remove externalBalance
        externalDecimals,
      };
    };
  },
  xor(...args): Nullable<RegisteredAccountAsset> {
    const { getters } = assetsGetterContext(args);
    return getters.assetDataByAddress(XOR.address);
  },
});

export default getters;

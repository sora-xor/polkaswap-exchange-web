import { api } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { ANLOG_TIMECHAIN } from '@/consts/analog';
import { assetsGetterContext } from '@/store/assets';

import type { AssetsState } from './types';
import type { Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

const getters = defineGetters<AssetsState>()({
  whitelistAssets(...args): Array<Asset> {
    const { rootState, rootGetters } = assetsGetterContext(args);
    return rootState.wallet.account.assets.filter((asset: Asset) =>
      api.assets.isWhitelist(asset, rootGetters.wallet.account.whitelist)
    );
  },
  assetDataByAddress(...args): (address?: Nullable<string>) => Nullable<RegisteredAccountAsset> {
    const { state, rootGetters, rootState } = assetsGetterContext(args);

    return (address?: Nullable<string>): Nullable<RegisteredAccountAsset> => {
      if (!address) return undefined;
      // chain hasn't address
      const asset = rootState.wallet.account.assets.find(
        (asset) => asset.address === address || asset.symbol === address
      );

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
    return getters.assetDataByAddress(ANLOG_TIMECHAIN.address);
  },
});

export default getters;

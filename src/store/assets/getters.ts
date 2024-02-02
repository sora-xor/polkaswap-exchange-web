import { XOR, ETH } from '@sora-substrate/util/build/assets/consts';
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
  assetDataByAddress(...args): (address?: Nullable<string>) => Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = assetsGetterContext(args);

    return (address?: Nullable<string>): Nullable<RegisteredAccountAsset> => {
      if (!address) return undefined;

      const asset = rootGetters.wallet.account.assetsDataTable[address];

      if (!asset) return null;

      const { address: externalAddress, decimals: externalDecimals } = state.registeredAssets[asset.address] || {};

      const { balance } = rootGetters.wallet.account.accountAssetsAddressTable[asset.address] || {};

      // [TODO: Liberland]
      const externalAddressCasted =
        typeof externalAddress === 'object' ? externalAddress?.Asset?.toString() ?? '' : externalAddress ?? '';

      return {
        ...asset,
        balance,
        externalAddress: externalAddressCasted,
        externalBalance: ZeroStringValue, // remove externalBalance
        externalDecimals,
      };
    };
  },
  xor(...args): Nullable<RegisteredAccountAsset> {
    const { getters } = assetsGetterContext(args);
    return getters.assetDataByAddress(XOR.address);
  },
  eth(...args): Nullable<RegisteredAccountAsset> {
    const { getters } = assetsGetterContext(args);
    return getters.assetDataByAddress(ETH.address);
  },
});

export default getters;

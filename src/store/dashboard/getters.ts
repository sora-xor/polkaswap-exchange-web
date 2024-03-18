import { FPNumber } from '@sora-substrate/math';
import { defineGetters } from 'direct-vuex';

import type { OwnedAsset } from '@/modules/dashboard/types';
import { dashboardGetterContext } from '@/store/dashboard';

import type { DashboardState } from './types';

const getters = defineGetters<DashboardState>()({
  ownedAssets(...args): Array<OwnedAsset> {
    const { state, rootState, rootGetters } = dashboardGetterContext(args);

    return state.ownedAssetIds.reduce<Array<OwnedAsset>>((assets, id) => {
      const asset = rootGetters.wallet.account.assetsDataTable[id];
      if (!asset) return assets;

      const fiatObj = rootState.wallet.account.fiatPriceObject[id];
      const fiat = fiatObj ? FPNumber.fromCodecValue(fiatObj).toString() : fiatObj;

      assets.push({ ...asset, fiat });
      return assets;
    }, []);
  },
});

export default getters;

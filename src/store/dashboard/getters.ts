import { FPNumber } from '@sora-substrate/math';
import { defineGetters } from '@/store/module-helpers';

import type { OwnedAsset } from '@/modules/dashboard/types';
import { dashboardGetterContext } from '@/store/dashboard';
import { requireAppStore } from '@/utils/app-store';

import type { DashboardState } from './types';

const resolveWalletAccount = (rootState: any, rootGetters: any) => {
  const account = rootState?.wallet?.account;
  if (account) return account;

  const legacyStore = requireAppStore();

  return legacyStore?.state?.wallet?.account ?? legacyStore?.getters?.wallet?.account;
};

const resolveAssetsTable = (rootGetters: any) => {
  const table = rootGetters?.wallet?.account?.assetsDataTable;
  if (table) return table;

  const legacyStore = requireAppStore();

  return legacyStore?.getters?.wallet?.account?.assetsDataTable ?? {};
};

const getters = defineGetters<DashboardState>()({
  ownedAssets(...args): Array<OwnedAsset> {
    const { state, rootState, rootGetters } = dashboardGetterContext(args);
    const walletAccount = resolveWalletAccount(rootState, rootGetters);
    const assetsTable = resolveAssetsTable(rootGetters);

    return state.ownedAssetIds.reduce<Array<OwnedAsset>>((assets, id) => {
      const asset = assetsTable[id];
      if (!asset) return assets;

      const fiatObj = walletAccount?.fiatPriceObject?.[id];
      const fiat = fiatObj ? FPNumber.fromCodecValue(fiatObj).toString() : fiatObj;

      assets.push({ ...asset, fiat });
      return assets;
    }, []);
  },
});

export default getters;

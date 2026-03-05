import { api } from '@wallet';
import { defineActions } from 'direct-vuex';

import { dashboardActionContext } from '@/store/dashboard';

const INTERVAL = 2 * 60_000;

const actions = defineActions({
  async requestOwnedAssetIds(context): Promise<void> {
    const { commit, rootGetters } = dashboardActionContext(context);
    const account = rootGetters.wallet?.account;
    const accountId = account?.account?.address;
    const isLoggedIn = Boolean(account?.isLoggedIn);

    if (!isLoggedIn || !accountId) {
      commit.resetOwnedAssetIds();
      return;
    }

    try {
      const assetIds = await api.assets.getOwnedAssetIds(accountId);
      commit.setOwnedAssetIds(assetIds);
    } catch (error) {
      console.error(error);
      commit.resetOwnedAssetIds();
    }
  },
  async subscribeOnOwnedAssets(context): Promise<void> {
    const { commit, dispatch } = dashboardActionContext(context);

    commit.resetOwnedAssetIdsInterval();
    await dispatch.requestOwnedAssetIds();

    const interval = setInterval(() => {
      dispatch.requestOwnedAssetIds();
    }, INTERVAL);

    commit.setOwnedAssetIdsInterval(interval);
  },
  async reset(context): Promise<void> {
    const { commit } = dashboardActionContext(context);
    commit.resetOwnedAssetIdsInterval();
    commit.resetOwnedAssetIds();
  },
});

export default actions;

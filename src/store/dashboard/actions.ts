import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { dashboardActionContext } from '@/store/dashboard';

const INTERVAL = 2 * 60_000;

const actions = defineActions({
  async requestOwnedAssetIds(context): Promise<void> {
    const { commit, rootGetters } = dashboardActionContext(context);
    try {
      const accountId = rootGetters.wallet.account.account.address;
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

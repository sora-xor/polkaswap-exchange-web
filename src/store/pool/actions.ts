import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';

import { poolActionContext } from '@/store/pool';
import { waitForAccountPair } from '@/utils';

const actions = defineActions({
  async subscribeOnAccountLiquidityList(context): Promise<void> {
    const { commit, rootGetters } = poolActionContext(context);
    commit.resetAccountLiquidityList();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(async () => {
      const userPoolsSubscription = api.poolXyk.getUserPoolsSubscription();
      commit.setAccountLiquidityList(userPoolsSubscription);
      // waiting until all liquidities loaded
      await api.poolXyk.accountLiquidityLoaded.toPromise();
    });
  },
  async subscribeOnAccountLiquidityUpdates(context): Promise<void> {
    const { commit, rootGetters } = poolActionContext(context);
    commit.resetAccountLiquidityUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(() => {
      const liquidityUpdatedSubscription = api.poolXyk.updated.subscribe(() => {
        commit.setAccountLiquidity(api.poolXyk.accountLiquidity);
      });

      commit.setAccountLiquidityUpdates(liquidityUpdatedSubscription);
    });
  },
  async unsubscribeAccountLiquidityListAndUpdates(context): Promise<void> {
    const { commit } = poolActionContext(context);
    commit.resetAccountLiquidityList();
    commit.resetAccountLiquidityUpdates();
    commit.resetAccountLiquidity();
    api.poolXyk.unsubscribeFromAllUpdates();
  },
});

export default actions;

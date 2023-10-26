import { api, getCurrentIndexer } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { firstValueFrom } from 'rxjs';

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
      if (api.poolXyk.accountLiquidityLoaded) {
        await firstValueFrom(api.poolXyk.accountLiquidityLoaded);
      }
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
  async subscribeOnAccountLockedLiquidity(context): Promise<void> {
    const { commit, rootGetters } = poolActionContext(context);
    commit.resetAccountLockedLiquidityUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(() => {
      const subscription = api.ceresLiquidityLocker.getLockerDataObservable().subscribe((data) => {
        commit.setAccountLockedLiquidity(data);
      });

      commit.setAccountLockedLiquidityUpdates(subscription);
    });
  },
  async unsubscribeAccountLiquidityListAndUpdates(context): Promise<void> {
    const { commit } = poolActionContext(context);
    commit.resetAccountLiquidityList();
    commit.resetAccountLiquidityUpdates();
    commit.resetAccountLockedLiquidityUpdates();
    commit.resetAccountLiquidity();
    commit.resetPoolApySubscription();
    commit.resetPoolApyObject();
    api.poolXyk.unsubscribeFromAllUpdates();
  },
  async getPoolApyObject(context): Promise<void> {
    const { commit } = poolActionContext(context);

    const indexer = getCurrentIndexer();
    const data = await indexer.services.explorer.pool.getPoolsApyObject();

    if (data) {
      commit.setPoolApyObject(data);
    }
  },
  async subscribeOnPoolsApy(context): Promise<void> {
    const { commit, dispatch } = poolActionContext(context);
    commit.resetPoolApySubscription();

    await dispatch.getPoolApyObject();

    const indexer = getCurrentIndexer();
    const subscription = indexer.services.explorer.pool.createPoolsApySubscription(
      (apy) => {
        commit.updatePoolApyObject(apy);
      },
      () => {
        commit.resetPoolApyObject();
      }
    );

    commit.setPoolApySubscription(subscription);
  },
});

export default actions;

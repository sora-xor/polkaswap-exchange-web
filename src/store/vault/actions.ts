import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { vaultActionContext } from '@/store/vault';

const INTERVAL = 60_000;

const actions = defineActions({
  async subscribeOnAccountVaults(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetAccountVaultIdsSubscription();
    try {
      const idsSubscription = api.kensetsu.subscribeOnAccountVaultIds().subscribe((ids) => {
        commit.resetAccountVaultsSubscription();
        const subscription = api.kensetsu.subscribeOnVaults(ids).subscribe((vaults) => {
          commit.setAccountVaults(vaults);
        });
        commit.setAccountVaultsSubscription(subscription);
      });
      commit.setAccountVaultIdsSubscription(idsSubscription);
    } catch (error) {
      commit.resetAccountVaultIdsSubscription();
      commit.resetAccountVaultsSubscription();
      commit.resetAccountVaults();
    }
  },
  async requestCollaterals(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    try {
      const collaterals = await api.kensetsu.getCollaterals();
      commit.setCollaterals(collaterals);
    } catch (error) {
      console.error(error);
      commit.resetCollaterals();
    }
  },
  async subscribeOnCollaterals(context): Promise<void> {
    const { commit, dispatch } = vaultActionContext(context);
    commit.resetCollateralsInterval();
    await dispatch.requestCollaterals();

    const interval = setInterval(() => {
      dispatch.requestCollaterals();
    }, INTERVAL);

    commit.setCollateralsInterval(interval);
  },
  async reset(context): Promise<void> {
    const { commit } = vaultActionContext(context);
    commit.resetCollateralsInterval();
    commit.resetCollaterals();
    commit.resetAccountVaultIdsSubscription();
    commit.resetAccountVaultsSubscription();
    commit.resetAccountVaults();
  },
});

export default actions;

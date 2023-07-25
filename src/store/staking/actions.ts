import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { stakingFarmingActionContext } from '@/store/staking';
import { waitForAccountPair } from '@/utils';

import { StakingAccountPool } from './types';

import type { Subscription } from 'rxjs';

type Era = number;

const actions = defineActions({
  async deposit(context, amount: number): Promise<void> {
    const { rootGetters } = stakingFarmingActionContext(context);

    // Temporary using connected account as controller
    const controllerAddress = rootGetters.wallet.account.account.address;
    const controllerAccount = { address: controllerAddress };

    // Set a controller
    await api.staking.setController(controllerAccount);

    const validators = await api.staking.getWannabeValidators();

    // Nominate validators using the controller account
    await api.staking.nominate({ validators: validators.map((v) => v.address) });

    // Set the reward destination
    await api.staking.setPayee({ payee: 'Stash' as any });

    await api.staking.bond({ controller: controllerAddress, value: amount, payee: controllerAddress });
  },

  async withdraw(context, amount: number): Promise<void> {
    await api.staking.withdrawUndonded({ value: amount });
  },

  async claimRewards(context, { pool, era }: { pool: StakingAccountPool; era: Era }): Promise<void> {
    const validators = await api.staking.getElectedValidators(era);

    await api.staking.payout({ validators: validators.map((validator) => validator.address), eraIndex: era });
  },

  async stakeMore(context, amount: number): Promise<void> {
    // Call the bondExtra method to stake more
    await api.staking.bondExtra({ value: amount });
  },

  async stakeLess(context, amount: number): Promise<void> {
    // Call the unbond method to stake less
    await api.staking.unbond({ value: amount });
  },

  async chill(context): Promise<void> {
    await api.staking.chill();
  },
});

export default actions;

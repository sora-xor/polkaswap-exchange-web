import { FPNumber } from '@sora-substrate/math';
import { defineGetters } from 'direct-vuex';

import { stakingGetterContext } from './index';

import type { StakingState } from './types';

const getters = defineGetters<StakingState>()({
  stash(...args): string {
    const { rootGetters } = stakingGetterContext(args);

    return rootGetters.wallet.account.account.address;
  },
});

export default getters;

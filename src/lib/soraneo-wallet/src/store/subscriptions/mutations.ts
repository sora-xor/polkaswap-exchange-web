import { defineMutations } from 'direct-vuex';

import type { SubscriptionsState } from './types';

const mutations = defineMutations<SubscriptionsState>()({
  setSubscription(state, newSubscription: Nullable<VoidFunction>): void {
    state.storageUpdatesSubscription = newSubscription;
  },
});

export default mutations;

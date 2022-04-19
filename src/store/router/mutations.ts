import { defineMutations } from 'direct-vuex';

import type { RouterState } from './types';

const mutations = defineMutations<RouterState>()({
  setRoute(state, params: RouterState): void {
    state.prev = params.prev;
    state.current = params.current;
  },
});

export default mutations;

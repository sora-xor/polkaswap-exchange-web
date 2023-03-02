import { defineMutations } from 'direct-vuex';

import type { RouterState, RouterParams } from './types';

const mutations = defineMutations<RouterState>()({
  setRoute(state, params: RouterParams): void {
    state.prev = params.prev;
    state.current = params.current;
  },
  setLoading(state, loading: boolean): void {
    state.loading = loading;
  },
});

export default mutations;

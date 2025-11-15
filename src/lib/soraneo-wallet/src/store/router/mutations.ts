import { defineMutations } from 'direct-vuex';

import { useRouterStore } from '@/stores/router';
import { enterLegacySync, isPiniaSyncing, leaveLegacySync } from '@/stores/router/sync';

import type { Route, RouterState } from './types';

const mutations = defineMutations<RouterState>()({
  navigate(state, params: Route): void {
    state.previousRoute = state.currentRoute;
    state.previousRouteParams = { ...state.currentRouteParams };
    state.currentRoute = params.name;
    state.currentRouteParams = params.params || {};
    if (isPiniaSyncing()) {
      return;
    }
    enterLegacySync();
    try {
      const routerStore = useRouterStore();
      routerStore.navigate(params);
    } finally {
      leaveLegacySync();
    }
  },
});

export default mutations;

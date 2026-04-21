import { readonly, ref } from 'vue';

const routerLoadingState = ref(false);

/**
 * App-owned loading state for router-driven shell transitions.
 */
export const appRouterLoading = readonly(routerLoadingState);

/**
 * Updates the shell loading flag without depending on the legacy router store.
 */
export const setAppRouterLoading = (loading: boolean): void => {
  routerLoadingState.value = loading;
};

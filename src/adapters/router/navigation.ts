import { useRouterStore } from '@/stores/router';

import type { RouterParams } from '@/stores/router/types';

const warnedMessages = new Set<string>();
const warn = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(`[router-adapter] ${message}`);
};

export const syncLegacyRoute = (params: RouterParams): void => {
  const routerStore = useRouterStore();

  if (typeof routerStore.setRoute === 'function') {
    routerStore.setRoute(params);
    return;
  }

  if (typeof routerStore.navigate === 'function' && params.current) {
    routerStore.navigate({ name: params.current, params: params.currentParams ?? {} });
    return;
  }

  warn('router.setRoute missing');
};

export const setLegacyRouterLoading = (loading: boolean): void => {
  const routerStore = useRouterStore();

  if (typeof routerStore.setLoading === 'function') {
    routerStore.setLoading(loading);
    return;
  }

  warn('router.setLoading missing');
};

import { setAppRouterLoading } from '@/app/navigation/loading';
import { useRouterStore } from '@/stores/router';

import type { RouterParams } from '@/stores/router/types';

const warnedMessages = new Set<string>();
const warn = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(`[router-adapter] ${message}`);
};

export const syncRoute = (params: RouterParams): void => {
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

export const setRouterLoading = (loading: boolean): void => {
  setAppRouterLoading(loading);

  const routerStore = useRouterStore();

  if (typeof routerStore.setLoading === 'function') {
    routerStore.setLoading(loading);
    return;
  }

  warn('router.setLoading missing');
};

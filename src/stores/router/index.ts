import { defineStore } from 'pinia';

import type { Nullable } from '@/types/common';
import { RouteNames } from '@/consts/navigation';
import type { RouterParams, RouterState } from './types';

type WalletStoreModule = typeof import('@/stores/wallet');

let walletStoreModulePromise: Promise<WalletStoreModule> | null = null;

const getWalletStore = async () => {
  walletStoreModulePromise ??= import('@/stores/wallet');
  const { useWalletStore } = await walletStoreModulePromise;
  return useWalletStore();
};

const buildInitialState = (): RouterState => ({
  current: null,
  currentParams: {},
  prev: null,
  prevParams: {},
  loading: false,
});

const normalizeRouteName = (value?: Nullable<string>): Nullable<string> =>
  typeof value === 'string' && value.length > 0 ? value : null;

export const useRouterStore = defineStore('router', {
  state: (): RouterState => buildInitialState(),
  getters: {
    isLoading(state): boolean {
      return state.loading;
    },
  },
  actions: {
    reset(): void {
      this.$patch(buildInitialState());
    },
    setRoute(params: RouterParams): void {
      const nextCurrent = normalizeRouteName(params.current);
      const nextPrev = normalizeRouteName(params.prev ?? this.current);

      this.prev = nextPrev;
      this.prevParams = { ...(params.prevParams ?? this.currentParams) };
      this.current = nextCurrent;
      this.currentParams = { ...(params.currentParams ?? this.currentParams) };
    },
    navigate(route: { name: string; params?: Record<string, unknown> }): void {
      this.prev = this.current;
      this.prevParams = { ...this.currentParams };
      this.current = normalizeRouteName(route.name);
      this.currentParams = { ...(route.params ?? {}) };
    },
    setLoading(loading: boolean): void {
      this.loading = loading;
    },
    setCurrentParams(params: Record<string, unknown>): void {
      this.currentParams = { ...params };
    },
    setPrevRoute(route: Nullable<string>, params: Record<string, unknown> = {}): void {
      this.prev = normalizeRouteName(route);
      this.prevParams = { ...params };
    },
    async back(): Promise<void> {
      const walletStore = await getWalletStore();
      const isLoggedIn = Boolean(walletStore.isLoggedIn);
      if (!isLoggedIn || !this.prev || [this.current, this.prev].includes(RouteNames.WalletConnection)) {
        return;
      }
      this.navigate({ name: this.prev, params: this.prevParams });
    },
    async checkCurrentRoute(): Promise<void> {
      const walletStore = await getWalletStore();
      const isLoggedIn = Boolean(walletStore.isLoggedIn);
      const accountRoute = RouteNames.Wallet;
      const connectionRoute = RouteNames.WalletConnection;
      if (isLoggedIn && this.current === connectionRoute) {
        const nextRoute = this.prev && this.prev !== connectionRoute ? this.prev : accountRoute;
        const nextParams = nextRoute === this.prev ? this.prevParams : {};
        this.navigate({ name: nextRoute, params: nextParams });
      } else if (!isLoggedIn && this.current !== connectionRoute) {
        this.navigate({ name: connectionRoute });
      }
    },
  },
});

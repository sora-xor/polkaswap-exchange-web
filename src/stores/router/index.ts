import { defineStore } from 'pinia';

import type { Nullable } from '@/types/common';
import { RouteNames } from '@/consts';
import { useWalletStore } from '@/stores/wallet';
import type { RouterParams, RouterState } from './types';

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
    back(): void {
      const walletStore = useWalletStore();
      const isLoggedIn = Boolean(walletStore.isLoggedIn);
      if (!isLoggedIn || !this.prev || [this.current, this.prev].includes(RouteNames.WalletConnection)) {
        return;
      }
      this.navigate({ name: this.prev, params: this.prevParams });
    },
    checkCurrentRoute(): void {
      const walletStore = useWalletStore();
      const isLoggedIn = Boolean(walletStore.isLoggedIn);
      const accountRoute = RouteNames.Wallet;
      const connectionRoute = RouteNames.WalletConnection;
      if (isLoggedIn && this.current === connectionRoute) {
        this.navigate({ name: accountRoute });
      } else if (!isLoggedIn && this.current !== connectionRoute) {
        this.navigate({ name: connectionRoute });
      }
    },
  },
});

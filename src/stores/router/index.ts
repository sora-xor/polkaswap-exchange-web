import { defineStore } from 'pinia';

import { RouteNames } from '@wallet/src/consts';
import type { Nullable } from '@/types/common';
import { requireLegacyStore } from '@/utils/legacy-store';

import { enterPiniaSync, isLegacySyncing, leavePiniaSync } from './sync';
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
      const legacyStore = requireLegacyStore();
      if (!isLegacySyncing() && legacyStore?.commit?.wallet?.router?.navigate) {
        enterPiniaSync();
        try {
          legacyStore.commit.wallet.router.navigate(route);
        } finally {
          leavePiniaSync();
        }
      }
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
      const legacyStore = requireLegacyStore();
      const isLoggedIn = Boolean(legacyStore.getters?.wallet?.account?.isLoggedIn);
      if (!isLoggedIn || !this.prev || [this.current, this.prev].includes(RouteNames.WalletConnection)) {
        return;
      }
      this.navigate({ name: this.prev, params: this.prevParams });
    },
    checkCurrentRoute(): void {
      const legacyStore = requireLegacyStore();
      const isLoggedIn = Boolean(legacyStore.getters?.wallet?.account?.isLoggedIn);
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

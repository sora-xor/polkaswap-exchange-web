import { useRouterStore } from '@/stores/router';

import type { Nullable } from '@/types/common';

export type WalletNavigationTarget = {
  name: string;
  params?: Record<string, unknown>;
};

export type WalletRouteParams = Record<string, unknown>;

const getWalletRouterStore = () => useRouterStore();

/** Returns the current wallet-facing route name from the legacy router mirror. */
export const getWalletCurrentRoute = (): Nullable<string> => {
  return getWalletRouterStore().current as Nullable<string>;
};

/** Returns the current wallet-facing route params from the legacy router mirror. */
export const getWalletCurrentParams = <T extends WalletRouteParams = WalletRouteParams>(): T => {
  return (getWalletRouterStore().currentParams ?? {}) as T;
};

/** Returns the previous wallet-facing route name from the legacy router mirror. */
export const getWalletPreviousRoute = (): Nullable<string> => {
  return getWalletRouterStore().prev as Nullable<string>;
};

/** Returns the previous wallet-facing route params from the legacy router mirror. */
export const getWalletPreviousParams = <T extends WalletRouteParams = WalletRouteParams>(): T => {
  return (getWalletRouterStore().prevParams ?? {}) as T;
};

/** Navigates the internal wallet runtime through the legacy router mirror. */
export const navigateWallet = (target: WalletNavigationTarget): void => {
  getWalletRouterStore().navigate(target);
};

/** Reconciles the mirrored wallet route with the outer router after auth changes. */
export const syncWalletCurrentRoute = (): void => {
  void getWalletRouterStore().checkCurrentRoute();
};

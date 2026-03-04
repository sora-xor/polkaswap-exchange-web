import { withLegacyStore } from '@/utils/legacy-store';

import type { RouterParams } from '@/stores/router/types';
import type { Nullable } from '@/types/common';
import type { LegacyStore } from '@/utils/legacy-store';

const warnedMessages = new Set<string>();
const warn = (message: string): void => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(`[router-adapter] ${message}`);
};

const withRouterCommit = <T extends (...args: any[]) => unknown>(
  getter: (legacy: LegacyStore) => Nullable<T>,
  message: string
): T | undefined => {
  return withLegacyStore((legacyStore) => {
    const commitFn = getter(legacyStore) as Nullable<T>;

    if (typeof commitFn !== 'function') {
      warn(message);
      return undefined;
    }

    return commitFn;
  });
};

export const syncLegacyRoute = (params: RouterParams): void => {
  withLegacyStore((legacyStore) => {
    const setRoute = legacyStore?.commit?.router?.setRoute as Nullable<(payload: RouterParams) => void>;

    if (typeof setRoute === 'function') {
      setRoute(params);
      return;
    }

    const navigate = legacyStore?.commit?.router?.navigate as Nullable<
      (payload: { name: string; params?: Record<string, unknown> }) => void
    >;

    if (typeof navigate === 'function' && params.current) {
      navigate({ name: params.current, params: params.currentParams ?? {} });
      return;
    }

    warn('router.setRoute missing');
  });
};

export const setLegacyRouterLoading = (loading: boolean): void => {
  const setLoading = withRouterCommit(
    (legacyStore) =>
      (legacyStore?.commit?.router?.setLoading as Nullable<(loading: boolean) => void>) ??
      (legacyStore?.commit?.wallet?.router?.setLoading as Nullable<(loading: boolean) => void>),
    'router.setLoading missing'
  );

  setLoading?.(loading);
};

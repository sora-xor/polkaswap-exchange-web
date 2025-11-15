import { withLegacyStore } from '@/utils/legacy-store';

import type { RouterParams } from '@/stores/router/types';
import type { Nullable } from '@/types/common';
import type { LegacyStore } from '@/utils/legacy-store';

const warn = (message: string): void => {
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
  const setRoute = withRouterCommit((legacyStore) => legacyStore?.commit?.router?.setRoute, 'router.setRoute missing');

  setRoute?.(params);
};

export const setLegacyRouterLoading = (loading: boolean): void => {
  const setLoading = withRouterCommit(
    (legacyStore) => legacyStore?.commit?.router?.setLoading,
    'router.setLoading missing'
  );

  setLoading?.(loading);
};

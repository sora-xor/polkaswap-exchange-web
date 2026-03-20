import { afterEach, describe, expect, it, vi } from 'vitest';

let storeShape: any = null;

vi.mock('@/utils/app-store', () => ({
  withAppStore: (callback: (store: any) => unknown) => {
    if (!storeShape) return undefined;
    return callback(storeShape);
  },
}));

import { setLegacyRouterLoading, syncLegacyRoute } from '@/adapters/router/navigation';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  warnSpy.mockClear();
  storeShape = null;
});

describe('router legacy adapter', () => {
  it('syncLegacyRoute updates router module when mutation exists', () => {
    const setRoute = vi.fn();
    storeShape = {
      commit: {
        router: {
          setRoute,
        },
      },
    };

    syncLegacyRoute({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });

    expect(setRoute).toHaveBeenCalledWith({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('syncLegacyRoute warns when mutation missing', () => {
    storeShape = { commit: { router: {} } };

    syncLegacyRoute({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });

    expect(warnSpy).toHaveBeenCalledWith('[router-adapter] router.setRoute missing');
  });

  it('syncLegacyRoute falls back to legacy navigate mutation', () => {
    const navigate = vi.fn();
    storeShape = {
      commit: {
        router: {
          navigate,
        },
      },
    };

    syncLegacyRoute({ prev: null, current: 'swap', currentParams: { a: 1 }, prevParams: {} });

    expect(navigate).toHaveBeenCalledWith({ name: 'swap', params: { a: 1 } });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('setLegacyRouterLoading updates loading flag', () => {
    const setLoading = vi.fn();
    storeShape = {
      commit: {
        router: {
          setLoading,
        },
      },
    };

    setLegacyRouterLoading(true);

    expect(setLoading).toHaveBeenCalledWith(true);
  });

  it('setLegacyRouterLoading falls back to wallet router loading mutation', () => {
    const setLoading = vi.fn();
    storeShape = {
      commit: {
        router: {},
        wallet: {
          router: {
            setLoading,
          },
        },
      },
    };

    setLegacyRouterLoading(true);

    expect(setLoading).toHaveBeenCalledWith(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

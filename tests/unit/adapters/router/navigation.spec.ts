import { afterEach, describe, expect, it, vi } from 'vitest';

const routerStoreState = vi.hoisted(() => ({
  navigate: undefined as ReturnType<typeof vi.fn> | undefined,
  setLoading: undefined as ReturnType<typeof vi.fn> | undefined,
  setRoute: undefined as ReturnType<typeof vi.fn> | undefined,
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => routerStoreState,
}));

import { setLegacyRouterLoading, syncLegacyRoute } from '@/adapters/router/navigation';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  warnSpy.mockClear();
  routerStoreState.setRoute = undefined;
  routerStoreState.navigate = undefined;
  routerStoreState.setLoading = undefined;
});

describe('router legacy adapter', () => {
  it('syncLegacyRoute updates the Pinia router store when setRoute exists', () => {
    const setRoute = vi.fn();
    routerStoreState.setRoute = setRoute;

    syncLegacyRoute({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });

    expect(setRoute).toHaveBeenCalledWith({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('syncLegacyRoute warns when route setters are missing', () => {
    syncLegacyRoute({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });

    expect(warnSpy).toHaveBeenCalledWith('[router-adapter] router.setRoute missing');
  });

  it('syncLegacyRoute falls back to navigate when setRoute is unavailable', () => {
    const navigate = vi.fn();
    routerStoreState.navigate = navigate;

    syncLegacyRoute({ prev: null, current: 'swap', currentParams: { a: 1 }, prevParams: {} });

    expect(navigate).toHaveBeenCalledWith({ name: 'swap', params: { a: 1 } });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('setLegacyRouterLoading updates the Pinia loading flag', () => {
    const setLoading = vi.fn();
    routerStoreState.setLoading = setLoading;

    setLegacyRouterLoading(true);

    expect(setLoading).toHaveBeenCalledWith(true);
  });

  it('setLegacyRouterLoading warns when loading setter is missing', () => {
    setLegacyRouterLoading(true);

    expect(warnSpy).toHaveBeenCalledWith('[router-adapter] router.setLoading missing');
  });
});

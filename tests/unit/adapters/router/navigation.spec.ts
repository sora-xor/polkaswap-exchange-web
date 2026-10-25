import { afterEach, describe, expect, it, vi } from 'vitest';

const routerStoreState = vi.hoisted(() => ({
  navigate: undefined as ReturnType<typeof vi.fn> | undefined,
  setLoading: undefined as ReturnType<typeof vi.fn> | undefined,
  setRoute: undefined as ReturnType<typeof vi.fn> | undefined,
}));
const appRouterLoadingState = vi.hoisted(() => ({
  setAppRouterLoading: vi.fn(),
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => routerStoreState,
}));

vi.mock('@/app/navigation/loading', () => ({
  setAppRouterLoading: appRouterLoadingState.setAppRouterLoading,
}));

import { setRouterLoading, syncRoute } from '@/adapters/router/navigation';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  warnSpy.mockClear();
  appRouterLoadingState.setAppRouterLoading.mockClear();
  routerStoreState.setRoute = undefined;
  routerStoreState.navigate = undefined;
  routerStoreState.setLoading = undefined;
});

describe('router adapter', () => {
  it('syncRoute updates the Pinia router store when setRoute exists', () => {
    const setRoute = vi.fn();
    routerStoreState.setRoute = setRoute;

    syncRoute({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });

    expect(setRoute).toHaveBeenCalledWith({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('syncRoute warns when route setters are missing', () => {
    syncRoute({ prev: null, current: 'swap', currentParams: {}, prevParams: {} });

    expect(warnSpy).toHaveBeenCalledWith('[router-adapter] router.setRoute missing');
  });

  it('syncRoute falls back to navigate when setRoute is unavailable', () => {
    const navigate = vi.fn();
    routerStoreState.navigate = navigate;

    syncRoute({ prev: null, current: 'swap', currentParams: { a: 1 }, prevParams: {} });

    expect(navigate).toHaveBeenCalledWith({ name: 'swap', params: { a: 1 } });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('setRouterLoading updates the Pinia loading flag', () => {
    const setLoading = vi.fn();
    routerStoreState.setLoading = setLoading;

    setRouterLoading(true);

    expect(appRouterLoadingState.setAppRouterLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(true);
  });

  it('setRouterLoading warns when loading setter is missing', () => {
    setRouterLoading(true);

    expect(appRouterLoadingState.setAppRouterLoading).toHaveBeenCalledWith(true);
    expect(warnSpy).toHaveBeenCalledWith('[router-adapter] router.setLoading missing');
  });
});

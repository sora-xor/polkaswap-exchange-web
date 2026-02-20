import { describe, expect, it, vi } from 'vitest';

import { PageNames } from '@/consts';
import { createBeforeEachGuard } from '@/router/guards/navigation';

import type { NavigationGuardServices } from '@/router/guards/navigation';
import type { RouteLocationNormalized } from 'vue-router';

const createRoute = ({
  name,
  meta = {},
  params = {},
}: {
  name?: PageNames;
  meta?: Record<string, unknown>;
  params?: Record<string, unknown>;
}): RouteLocationNormalized =>
  ({
    name,
    meta,
    params,
    path: '',
    fullPath: '',
    hash: '',
    query: {},
    redirectedFrom: undefined,
    href: '',
    matched: [{ meta }],
  }) as RouteLocationNormalized;

const createServices = (overrides: Partial<NavigationGuardServices> = {}): NavigationGuardServices => ({
  routerStore: {
    setRoute: vi.fn(),
  },
  walletStore: {
    isLoggedIn: false,
  },
  bridgeHistoryStore: {
    resetHistoryPage: vi.fn(),
  },
  syncRoute: vi.fn(),
  persistReferral: vi.fn(),
  validateAddress: vi.fn(),
  updateDocumentTitle: vi.fn(),
  ...overrides,
});

describe('router navigation guard', () => {
  it('redirects unnamed routes to swap', () => {
    const services = createServices();
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    guard(createRoute({ name: undefined }), createRoute({ name: PageNames.Wallet }), next);

    expect(services.routerStore.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Wallet,
      current: PageNames.Swap,
    });
    expect(services.syncRoute).toHaveBeenCalledWith({
      prev: PageNames.Wallet,
      current: PageNames.Swap,
    });
    expect(next).toHaveBeenCalledWith({ name: PageNames.Swap });
  });

  it('redirects to bridge when auth is required and user is not logged in', () => {
    const services = createServices();
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    guard(
      createRoute({ name: PageNames.BridgeTransactionsHistory, meta: { requiresAuth: true } }),
      createRoute({ name: PageNames.Swap }),
      next
    );

    expect(services.bridgeHistoryStore.resetHistoryPage).toHaveBeenCalled();
    expect(services.routerStore.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Swap,
      current: PageNames.Bridge,
    });
    expect(next).toHaveBeenCalledWith({ name: PageNames.Bridge });
  });

  it('persists referrals and stays on invitation route when already authenticated', () => {
    const services = createServices({
      walletStore: { isLoggedIn: true },
      validateAddress: vi.fn().mockReturnValue(true),
    });
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    guard(
      createRoute({
        name: PageNames.ReferralProgram,
        meta: { isInvitationRoute: true },
        params: { referrerAddress: 'addr' },
      }),
      createRoute({ name: PageNames.Swap }),
      next
    );

    expect(services.persistReferral).toHaveBeenCalledWith('addr');
    expect(services.routerStore.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Swap,
      current: PageNames.ReferralProgram,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows navigation to unprotected routes without redirects', () => {
    const services = createServices({
      walletStore: { isLoggedIn: true },
    });
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    guard(createRoute({ name: PageNames.Stats }), createRoute({ name: PageNames.Wallet }), next);

    expect(services.routerStore.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Wallet,
      current: PageNames.Stats,
    });
    expect(services.syncRoute).toHaveBeenCalledWith({
      prev: PageNames.Wallet,
      current: PageNames.Stats,
    });
    expect(next).toHaveBeenCalledWith();
  });
});

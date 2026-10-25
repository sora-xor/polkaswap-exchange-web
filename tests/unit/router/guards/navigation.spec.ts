import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PageNames } from '@/consts';
import {
  clearPendingReferralActionNavigation,
  markPendingReferralActionNavigation,
} from '@/shared/navigation/referralAction';
import { createBeforeEachGuard } from '@/app/router/guards/navigation';

import type { NavigationGuardServices } from '@/app/router/guards/navigation';
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
  setRoute: vi.fn(),
  walletStore: {
    isLoggedIn: false,
  },
  resetBridgeHistoryPage: vi.fn(),
  persistReferral: vi.fn(),
  validateAddress: vi.fn(),
  updateDocumentTitle: vi.fn(),
  ...overrides,
});

describe('router navigation guard', () => {
  beforeEach(() => {
    clearPendingReferralActionNavigation();
  });

  it.each([
    { name: PageNames.ReferralBonding, action: 'bond' },
    { name: PageNames.ReferralUnbonding, action: 'unbond' },
  ])('keeps disconnected direct $action entries on the referral dashboard', async ({ name, action }) => {
    const services = createServices();
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    await guard(
      createRoute({ name, meta: { requiresAuth: true } }),
      createRoute({ name: PageNames.ReferralProgram }),
      next
    );

    expect(services.setRoute).toHaveBeenCalledWith({
      prev: PageNames.ReferralProgram,
      current: PageNames.ReferralProgram,
    });
    expect(next).toHaveBeenCalledWith({
      name: PageNames.ReferralProgram,
      params: {
        referrerAddress: action,
      },
    });
  });

  it.each([PageNames.ReferralBonding, PageNames.ReferralUnbonding])(
    'opens %s directly for a connected account on reload',
    async (name) => {
      const getWalletStore = vi.fn(async () => ({ isLoggedIn: true }));
      const services = createServices({ walletStore: undefined, getWalletStore });
      const guard = createBeforeEachGuard(services);
      const next = vi.fn();

      await guard(createRoute({ name, meta: { requiresAuth: true } }), createRoute({}), next);

      expect(getWalletStore).toHaveBeenCalledTimes(1);
      expect(services.setRoute).toHaveBeenCalledWith({ prev: null, current: name });
      expect(next).toHaveBeenCalledExactlyOnceWith();
      expect(services.persistReferral).not.toHaveBeenCalled();
    }
  );

  it('still requires authentication for explicit bonding navigation after an account disconnects', async () => {
    markPendingReferralActionNavigation(PageNames.ReferralBonding);
    const guard = createBeforeEachGuard(createServices());
    const next = vi.fn();

    await guard(
      createRoute({ name: PageNames.ReferralBonding, meta: { requiresAuth: true } }),
      createRoute({ name: PageNames.ReferralProgram }),
      next
    );

    expect(next).toHaveBeenCalledExactlyOnceWith({ name: PageNames.Wallet });
  });

  it('allows explicit referral bonding navigation triggered from inside the app', async () => {
    markPendingReferralActionNavigation(PageNames.ReferralBonding);

    const services = createServices({
      walletStore: { isLoggedIn: true },
    });
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    await guard(
      createRoute({ name: PageNames.ReferralBonding, meta: { requiresAuth: true } }),
      createRoute({ name: PageNames.ReferralProgram }),
      next
    );

    expect(services.setRoute).toHaveBeenCalledWith({
      prev: PageNames.ReferralProgram,
      current: PageNames.ReferralBonding,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('redirects unnamed routes to swap', async () => {
    const services = createServices();
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    await guard(createRoute({ name: undefined }), createRoute({ name: PageNames.Wallet }), next);

    expect(services.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Wallet,
      current: PageNames.Swap,
    });
    expect(next).toHaveBeenCalledWith({ name: PageNames.Swap });
  });

  it('redirects to bridge when auth is required and user is not logged in', async () => {
    const services = createServices();
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    await guard(
      createRoute({ name: PageNames.BridgeTransactionsHistory, meta: { requiresAuth: true } }),
      createRoute({ name: PageNames.Swap }),
      next
    );

    expect(services.resetBridgeHistoryPage).toHaveBeenCalled();
    expect(services.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Swap,
      current: PageNames.Bridge,
    });
    expect(next).toHaveBeenCalledWith({ path: '/bridge/' });
  });

  it('persists referrals and stays on invitation route when already authenticated', async () => {
    const services = createServices({
      walletStore: { isLoggedIn: true },
      validateAddress: vi.fn().mockReturnValue(true),
    });
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    await guard(
      createRoute({
        name: PageNames.ReferralProgram,
        meta: { isInvitationRoute: true },
        params: { referrerAddress: 'addr' },
      }),
      createRoute({ name: PageNames.Swap }),
      next
    );

    expect(services.persistReferral).toHaveBeenCalledWith('addr');
    expect(services.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Swap,
      current: PageNames.ReferralProgram,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows navigation to unprotected routes without redirects', async () => {
    const services = createServices({
      walletStore: { isLoggedIn: true },
    });
    const guard = createBeforeEachGuard(services);
    const next = vi.fn();

    await guard(createRoute({ name: PageNames.Stats }), createRoute({ name: PageNames.Wallet }), next);

    expect(services.setRoute).toHaveBeenCalledWith({
      prev: PageNames.Wallet,
      current: PageNames.Stats,
    });
    expect(next).toHaveBeenCalledWith();
  });
});

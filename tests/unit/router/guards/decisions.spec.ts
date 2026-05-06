import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import {
  resolveAuthRedirect,
  resolveInvitationDecision,
  resolveReferralActionRedirect,
  shouldResetBridgeHistory,
} from '@/app/router/guards/decisions';

describe('router guard decisions', () => {
  it('detects when bridge history should reset', () => {
    expect(shouldResetBridgeHistory(PageNames.Swap, PageNames.BridgeTransactionsHistory)).toBe(true);
    expect(shouldResetBridgeHistory(PageNames.BridgeTransaction, PageNames.BridgeTransactionsHistory)).toBe(false);
  });

  it('handles invitation routes', () => {
    const decision = resolveInvitationDecision({
      isInvitationRoute: true,
      referrerParam: ['cnk'],
      isLoggedIn: true,
      validateAddress: (value) => value === 'cnk',
    });

    expect(decision.persistReferral).toBe('cnk');
    expect(decision.redirect?.name).toBe(PageNames.ReferralProgram);
    expect(decision.redirect?.callNext).toBe(false);
  });

  it('ignores invalid referral addresses but still redirects when logged in', () => {
    const decision = resolveInvitationDecision({
      isInvitationRoute: true,
      referrerParam: 'bad',
      isLoggedIn: true,
      validateAddress: () => false,
    });

    expect(decision.persistReferral).toBeUndefined();
    expect(decision.redirect?.name).toBe(PageNames.ReferralProgram);
  });

  it('returns auth redirect for protected routes', () => {
    const redirect = resolveAuthRedirect({
      requiresAuth: true,
      current: PageNames.BridgeTransactionsHistory,
      isLoggedIn: false,
    });

    expect(redirect?.name).toBe(PageNames.Bridge);
    expect(redirect?.path).toBe('/bridge/');
  });

  it('allows access when user already authenticated', () => {
    const redirect = resolveAuthRedirect({
      requiresAuth: true,
      current: PageNames.ReferralProgram,
      isLoggedIn: true,
    });

    expect(redirect).toBeUndefined();
  });

  it('redirects direct referral action entries back to the referral dashboard path-preserving route', () => {
    const redirect = resolveReferralActionRedirect({
      current: PageNames.ReferralBonding,
      allowNavigation: false,
    });

    expect(redirect).toEqual({
      name: PageNames.ReferralProgram,
      callNext: true,
      params: {
        referrerAddress: 'bond',
      },
    });
  });
});

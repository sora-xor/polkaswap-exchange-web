import { beforeEach, describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import {
  clearPendingReferralActionNavigation,
  consumePendingReferralActionNavigation,
  getReferralActionParam,
  isReferralActionPage,
  markPendingReferralActionNavigation,
} from '@/shared/navigation/referralAction';

describe('shared referral action navigation', () => {
  beforeEach(() => {
    clearPendingReferralActionNavigation();
  });

  it('detects referral action page names and exposes their route params', () => {
    expect(isReferralActionPage(PageNames.ReferralBonding)).toBe(true);
    expect(isReferralActionPage(PageNames.ReferralUnbonding)).toBe(true);
    expect(isReferralActionPage(PageNames.ReferralProgram)).toBe(false);
    expect(isReferralActionPage(null)).toBe(false);

    expect(getReferralActionParam(PageNames.ReferralBonding)).toBe('bond');
    expect(getReferralActionParam(PageNames.ReferralUnbonding)).toBe('unbond');
  });

  it('consumes only the matching pending referral navigation and clears it afterwards', () => {
    markPendingReferralActionNavigation(PageNames.ReferralBonding);

    expect(consumePendingReferralActionNavigation(PageNames.ReferralBonding)).toBe(true);
    expect(consumePendingReferralActionNavigation(PageNames.ReferralBonding)).toBe(false);
  });

  it('clears mismatched pending referral navigation to avoid leaking auth redirects', () => {
    markPendingReferralActionNavigation(PageNames.ReferralBonding);

    expect(consumePendingReferralActionNavigation(PageNames.ReferralUnbonding)).toBe(false);
    expect(consumePendingReferralActionNavigation(PageNames.ReferralBonding)).toBe(false);
  });

  it('explicitly clears pending referral navigation', () => {
    markPendingReferralActionNavigation(PageNames.ReferralUnbonding);
    clearPendingReferralActionNavigation();

    expect(consumePendingReferralActionNavigation(PageNames.ReferralUnbonding)).toBe(false);
  });
});

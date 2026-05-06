import { describe, expect, it } from 'vitest';

import routesSource from '@/features/referrals/routes.ts?raw';
import { referralRoutes } from '@/features/referrals';
import { PageNames } from '@/consts';

describe('referrals feature routes', () => {
  it('preserves the public referral bonding URL contract', () => {
    expect(referralRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/referral/bond', name: PageNames.ReferralBonding }),
        expect.objectContaining({ path: '/referral/unbond', name: PageNames.ReferralUnbonding }),
      ])
    );
  });

  it('uses feature-local async page imports instead of the legacy lazy view helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/ReferralBondingPage.vue'))");
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain('@/router/modules/referrals');
  });
});

import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { rewardsRoutes } from '@/features/rewards';
import routesSource from '@/features/rewards/routes.ts?raw';

describe('rewards feature routes', () => {
  it('preserves the public rewards URL contract', () => {
    expect(rewardsRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '',
          children: expect.arrayContaining([
            expect.objectContaining({ path: '/points', name: PageNames.PointSystemWrapper }),
            expect.objectContaining({ path: '/rewards', name: PageNames.Rewards }),
            expect.objectContaining({ path: '/referral/:referrerAddress?', name: PageNames.ReferralProgram }),
          ]),
        }),
      ])
    );
  });

  it('uses feature-local async page imports instead of the legacy lazy view helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/RewardsTabsPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/PointSystemV2Page.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/RewardsPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/ReferralProgramPage.vue'))");
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain("@/router/modules/rewards");
  });
});

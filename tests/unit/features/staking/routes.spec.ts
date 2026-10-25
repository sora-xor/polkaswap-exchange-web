import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { stakingRoutes } from '@/features/staking';
import { SoraStakingPageNames } from '@/modules/staking/sora/consts';
import { StakingPageNames } from '@/modules/staking/consts';
import routesSource from '@/features/staking/routes.ts?raw';

describe('staking feature routes', () => {
  it('preserves the public staking URL contract', () => {
    expect(stakingRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/staking',
          name: PageNames.StakingContainer,
          redirect: { name: StakingPageNames.Staking },
          children: expect.arrayContaining([expect.objectContaining({ path: 'list', name: StakingPageNames.Staking })]),
        }),
        expect.objectContaining({
          path: '',
          children: expect.arrayContaining([
            expect.objectContaining({ path: '/staking/sora', name: SoraStakingPageNames.Overview }),
            expect.objectContaining({
              path: '/staking/sora/validators/type',
              name: SoraStakingPageNames.ValidatorsType,
            }),
            expect.objectContaining({
              path: '/staking/sora/validators/select',
              name: SoraStakingPageNames.SelectValidators,
            }),
          ]),
        }),
      ])
    );
  });

  it('uses feature-local async page imports instead of legacy router helpers', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/StakingContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/StakingPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/SoraDataContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/SoraOverviewPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/SoraValidatorsTypePage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/SoraSelectValidatorsPage.vue'))");
    expect(routesSource).not.toContain('poolLazyView');
    expect(routesSource).not.toContain('demeterStakingLazyView');
    expect(routesSource).not.toContain('soraStakingLazyView');
    expect(routesSource).not.toContain('stakingLazyView');
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain('@/router/modules/staking');
  });
});

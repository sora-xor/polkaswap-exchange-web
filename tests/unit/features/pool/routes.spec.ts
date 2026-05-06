import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { PoolPageNames } from '@/features/pool/consts';
import { poolRoutes } from '@/features/pool';
import routesSource from '@/features/pool/routes.ts?raw';

describe('pool feature routes', () => {
  it('preserves the public pool URL contract', () => {
    expect(poolRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '',
          children: expect.arrayContaining([
            expect.objectContaining({
              path: '/pool',
              children: expect.arrayContaining([
                expect.objectContaining({ path: '', name: PoolPageNames.Pool }),
                expect.objectContaining({ path: 'add/:first?/:second?', name: PageNames.AddLiquidity }),
              ]),
            }),
          ]),
        }),
      ])
    );
  });

  it('uses feature-local async page imports for the pool route tree', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/DemeterDataContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/PoolContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/DemeterPoolPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/AddLiquidityPage.vue'))");
    expect(routesSource).not.toContain('poolLazyView');
    expect(routesSource).not.toContain('demeterStakingLazyView');
    expect(routesSource).not.toContain('@/router/modules');
  });
});

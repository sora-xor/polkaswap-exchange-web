import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { exploreRoutes } from '@/features/explore';
import routesSource from '@/features/explore/routes.ts?raw';

describe('explore feature routes', () => {
  it('preserves the public explore URL contract', () => {
    expect(exploreRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/explore',
          name: PageNames.ExploreContainer,
          children: expect.arrayContaining([
            expect.objectContaining({ path: 'tokens', name: PageNames.ExploreTokens }),
            expect.objectContaining({ path: 'books', name: PageNames.ExploreBooks }),
          ]),
        }),
      ])
    );
  });

  it('uses feature-local async page imports instead of legacy router helpers', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/ExploreContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/ExploreTokensPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/DemeterDataContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/ExploreDemeterPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/PoolContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/ExplorePoolsPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/ExploreBooksPage.vue'))");
    expect(routesSource).not.toContain('poolLazyView');
    expect(routesSource).not.toContain('demeterStakingLazyView');
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain("@/router/modules/explore");
  });
});

import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { miscRoutes } from '@/features/misc';
import routesSource from '@/features/misc/routes.ts?raw';

describe('misc feature routes', () => {
  it('preserves the public misc URL contract', () => {
    expect(miscRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/stats', name: PageNames.Stats }),
        expect.objectContaining({ path: '/trade/:first?/:second?', name: PageNames.OrderBook }),
        expect.objectContaining({ path: '/burn', name: PageNames.Burn }),
        expect.objectContaining({ path: '/:catchAll(.*)', redirect: '/swap' }),
      ])
    );
  });

  it('uses feature-local async page imports instead of the legacy lazy view helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/StatsPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/OrderBookPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/BurnPage.vue'))");
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain('@/router/modules/misc');
  });
});

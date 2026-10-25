import { describe, expect, it } from 'vitest';

import routesSource from '@/features/swap/routes.ts?raw';
import { swapRoutes } from '@/features/swap';
import { PageNames } from '@/consts';

describe('swap feature routes', () => {
  it('preserves the public swap URL contract', () => {
    expect(swapRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/', redirect: '/swap' }),
        expect.objectContaining({ path: '/swap/:first?/:second?', name: PageNames.Swap }),
      ])
    );
  });

  it('uses a feature-local async page import instead of the legacy lazy view helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/SwapPage.vue'))");
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain('@/views/Swap.vue');
  });
});

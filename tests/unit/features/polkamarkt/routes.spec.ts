import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { polkamarktRoutes } from '@/features/polkamarkt/routes';
import routesSource from '@/features/polkamarkt/routes.ts?raw';

describe('polkamarkt feature routes', () => {
  it('registers the native Polkamarkt hash route', () => {
    expect(polkamarktRoutes).toHaveLength(1);
    expect(polkamarktRoutes[0]).toMatchObject({
      path: '/polkamarkt/:marketId?',
      name: PageNames.Polkamarkt,
    });
  });

  it('uses the async import retry helper for the page component', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/PolkamarktPage.vue'))");
  });
});

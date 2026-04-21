import { describe, expect, it } from 'vitest';

import routesSource from '@/features/bridge/routes.ts?raw';
import { bridgeRoutes } from '@/features/bridge';
import { PageNames } from '@/consts';

describe('bridge feature routes', () => {
  it('preserves the public bridge URL contract', () => {
    expect(bridgeRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/bridge',
          children: expect.arrayContaining([
            expect.objectContaining({ path: '', name: PageNames.Bridge }),
            expect.objectContaining({ path: 'history', name: PageNames.BridgeTransactionsHistory }),
            expect.objectContaining({ path: 'transaction', name: PageNames.BridgeTransaction }),
          ]),
        }),
      ])
    );
  });

  it('uses feature-local async page imports instead of the legacy lazy view helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/BridgeContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/BridgePage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/BridgeTransactionsHistoryPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/BridgeTransactionPage.vue'))");
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain("@/router/modules/bridge");
  });
});

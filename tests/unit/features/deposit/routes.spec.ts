import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { depositRoutes } from '@/features/deposit';
import routesSource from '@/features/deposit/routes.ts?raw';

describe('deposit feature routes', () => {
  it('preserves the public deposit URL contract', () => {
    expect(depositRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/deposit', name: PageNames.DepositOptions }),
        expect.objectContaining({ path: '/deposit/history', name: PageNames.DepositTxHistory }),
        expect.objectContaining({ path: '/deposit/transfer-from-cex', name: PageNames.CedeStore }),
      ])
    );
  });

  it('uses feature-local async page imports instead of the legacy lazy view helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/DepositOptionsPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/DepositTxHistoryPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/CedeStorePage.vue'))");
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain("@/router/modules/deposit");
  });
});

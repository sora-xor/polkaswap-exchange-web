import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardRoutes } from '@/features/dashboard';
import routesSource from '@/features/dashboard/routes.ts?raw';

describe('dashboard feature routes', () => {
  it('preserves the public dashboard URL contract', () => {
    expect(dashboardRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/dashboard/owner',
          children: expect.arrayContaining([
            expect.objectContaining({ path: '', name: DashboardPageNames.AssetOwner }),
            expect.objectContaining({ path: ':asset', name: DashboardPageNames.AssetOwnerDetails }),
          ]),
        }),
        expect.objectContaining({ path: '/dashboard', redirect: '/wallet' }),
      ])
    );
  });

  it('uses feature-local async page imports instead of the legacy module router helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/AssetOwnerContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/AssetOwnerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/AssetOwnerDetailsPage.vue'))");
    expect(routesSource).toContain("path: '/dashboard'");
    expect(routesSource).not.toContain('dashboardLazyView');
    expect(routesSource).not.toContain("@/router/modules/dashboard");
  });
});

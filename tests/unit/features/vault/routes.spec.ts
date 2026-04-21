import { describe, expect, it } from 'vitest';

import { VaultPageNames } from '@/modules/vault/consts';
import { vaultRoutes } from '@/features/vault';
import routesSource from '@/features/vault/routes.ts?raw';

describe('vault feature routes', () => {
  it('preserves the public vault URL contract', () => {
    expect(vaultRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/kensetsu',
          children: expect.arrayContaining([
            expect.objectContaining({ path: '', name: VaultPageNames.Vaults }),
            expect.objectContaining({ path: ':vault', name: VaultPageNames.VaultDetails }),
          ]),
        }),
      ])
    );
  });

  it('uses feature-local async page imports instead of the legacy module router helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/VaultsContainerPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/VaultsPage.vue'))");
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/VaultDetailsPage.vue'))");
    expect(routesSource).not.toContain('vaultLazyView');
    expect(routesSource).not.toContain("@/router/modules/vault");
  });
});

import { describe, expect, it } from 'vitest';

import { PageNames } from '@/consts';
import { walletRoutes } from '@/features/wallet';
import routesSource from '@/features/wallet/routes.ts?raw';

describe('wallet feature routes', () => {
  it('preserves the public wallet URL contract', () => {
    expect(walletRoutes).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/wallet', name: PageNames.Wallet })])
    );
  });

  it('uses a feature-local async page import instead of the legacy lazy view helper', () => {
    expect(routesSource).toContain("loadAsyncImportWithRetry(() => import('./pages/WalletPage.vue'))");
    expect(routesSource).not.toContain('lazyView');
    expect(routesSource).not.toContain('@/router/modules/wallet');
  });
});

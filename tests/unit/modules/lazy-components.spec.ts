import { describe, expect, it } from 'vitest';

import { DashboardComponents } from '@/modules/dashboard/consts';
import { dashboardLazyComponent } from '@/modules/dashboard/router';
import { PoolComponents, PoolPageNames } from '@/modules/pool/consts';
import { poolLazyComponent, poolLazyViewComponent } from '@/modules/pool/router';
import { DemeterStakingComponents } from '@/modules/staking/demeter/consts';
import { SoraStakingComponents } from '@/modules/staking/sora/consts';
import { demeterStakingLazyComponent, soraStakingLazyComponent } from '@/modules/staking/router';
import { VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';

const hasAsyncLoader = (component: unknown): component is { __asyncLoader: () => Promise<unknown> } =>
  Boolean(component && typeof (component as { __asyncLoader?: unknown }).__asyncLoader === 'function');

describe('module lazy component helpers', () => {
  it('wraps module components with Vue async loaders', () => {
    const candidates = [
      poolLazyComponent(PoolComponents.AddLiquidityDialog),
      poolLazyViewComponent(PoolPageNames.Pool),
      vaultLazyComponent(VaultComponents.CreateVaultDialog),
      dashboardLazyComponent(DashboardComponents.CreateTokenDialog),
      demeterStakingLazyComponent(DemeterStakingComponents.StatusBadge),
      soraStakingLazyComponent(SoraStakingComponents.StatusBadge),
    ];

    for (const candidate of candidates) {
      expect(hasAsyncLoader(candidate)).toBe(true);
    }
  });
});

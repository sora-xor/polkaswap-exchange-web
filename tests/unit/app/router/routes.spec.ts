import { describe, expect, it } from 'vitest';

import { routes } from '@/app/router/routes';
import { bridgeRoutes } from '@/features/bridge/routes';
import { dashboardRoutes } from '@/features/dashboard/routes';
import { depositRoutes } from '@/features/deposit/routes';
import { exploreRoutes } from '@/features/explore/routes';
import { miscRoutes } from '@/features/misc/routes';
import { poolRoutes } from '@/features/pool/routes';
import { referralRoutes } from '@/features/referrals/routes';
import { rewardsRoutes } from '@/features/rewards/routes';
import { swapRoutes } from '@/features/swap/routes';
import { stakingRoutes } from '@/features/staking/routes';
import { vaultRoutes } from '@/features/vault/routes';
import { walletRoutes } from '@/features/wallet/routes';

describe('app router routes', () => {
  it('concatenates public feature route trees in shell order', () => {
    expect(routes).toEqual([
      ...swapRoutes,
      ...walletRoutes,
      ...bridgeRoutes,
      ...stakingRoutes,
      ...poolRoutes,
      ...exploreRoutes,
      ...rewardsRoutes,
      ...referralRoutes,
      ...depositRoutes,
      ...vaultRoutes,
      ...dashboardRoutes,
      ...miscRoutes,
    ]);
  });
});

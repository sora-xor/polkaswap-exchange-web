import { describe, expect, it } from 'vitest';

import { routes } from '@/app/router/routes';
import { bridgeRoutes } from '@/features/bridge';
import { dashboardRoutes } from '@/features/dashboard';
import { depositRoutes } from '@/features/deposit';
import { exploreRoutes } from '@/features/explore';
import { miscRoutes } from '@/features/misc';
import { poolRoutes } from '@/features/pool';
import { referralRoutes } from '@/features/referrals';
import { rewardsRoutes } from '@/features/rewards';
import { swapRoutes } from '@/features/swap';
import { stakingRoutes } from '@/features/staking';
import { vaultRoutes } from '@/features/vault';
import { walletRoutes } from '@/features/wallet';

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

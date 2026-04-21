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

import type { RouteRecordRaw } from 'vue-router';

/**
 * App-owned route assembly. Features contribute public route trees through
 * their entrypoints while legacy route modules remain on compatibility paths.
 */
export const routes: RouteRecordRaw[] = [
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
];

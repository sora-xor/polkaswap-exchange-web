import { bridgeRoutes } from '@/features/bridge/routes';
import { dashboardRoutes } from '@/features/dashboard/routes';
import { depositRoutes } from '@/features/deposit/routes';
import { exploreRoutes } from '@/features/explore/routes';
import { miscRoutes } from '@/features/misc/routes';
import { polkamarktRoutes } from '@/features/polkamarkt/routes';
import { poolRoutes } from '@/features/pool/routes';
import { referralRoutes } from '@/features/referrals/routes';
import { rewardsRoutes } from '@/features/rewards/routes';
import { swapRoutes } from '@/features/swap/routes';
import { stakingRoutes } from '@/features/staking/routes';
import { vaultRoutes } from '@/features/vault/routes';
import { walletRoutes } from '@/features/wallet/routes';

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
  ...polkamarktRoutes,
  ...miscRoutes,
];

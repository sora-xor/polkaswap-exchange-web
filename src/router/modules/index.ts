import { bridgeRoutes } from '@/router/modules/bridge';
import { dashboardRoutes } from '@/router/modules/dashboard';
import { depositRoutes } from '@/router/modules/deposit';
import { exploreRoutes } from '@/router/modules/explore';
import { miscRoutes } from '@/router/modules/misc';
import { referralRoutes } from '@/router/modules/referrals';
import { rewardsRoutes } from '@/router/modules/rewards';
import { stakingRoutes } from '@/router/modules/staking';
import { swapRoutes } from '@/router/modules/swap';
import { vaultRoutes } from '@/router/modules/vault';
import { walletRoutes } from '@/router/modules/wallet';

import type { RouteRecordRaw } from 'vue-router';

/**
 * Aggregated route tree grouped by feature areas to keep the router modular.
 */
export const routes: RouteRecordRaw[] = [
  ...swapRoutes,
  ...walletRoutes,
  ...bridgeRoutes,
  ...stakingRoutes,
  ...exploreRoutes,
  ...rewardsRoutes,
  ...referralRoutes,
  ...depositRoutes,
  ...vaultRoutes,
  ...dashboardRoutes,
  ...miscRoutes,
];

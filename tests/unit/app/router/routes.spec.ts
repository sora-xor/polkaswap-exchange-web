import { describe, expect, it } from 'vitest';

import { routes } from '@/app/router/routes';
import { bridgeRoutes } from '@/features/bridge/routes';
import { botTradingRoutes } from '@/features/bot-trading/routes';
import { dashboardRoutes } from '@/features/dashboard/routes';
import { depositRoutes } from '@/features/deposit/routes';
import { exploreRoutes } from '@/features/explore/routes';
import { miscRoutes } from '@/features/misc/routes';
import { polkamarktRoutes } from '@/features/polkamarkt/routes';
import { poolRoutes } from '@/features/pool/routes';
import { referralRoutes } from '@/features/referrals/routes';
import { rewardsRoutes } from '@/features/rewards/routes';
import { swapRoutes } from '@/features/swap/routes';
import { storeRoutes } from '@/features/store/routes';
import { stakingRoutes } from '@/features/staking/routes';
import { vaultRoutes } from '@/features/vault/routes';
import { walletRoutes } from '@/features/wallet/routes';

describe('app router routes', () => {
  it('concatenates public feature route trees in shell order', () => {
    expect(routes).toEqual([
      ...swapRoutes,
      ...botTradingRoutes,
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
      ...storeRoutes,
      ...miscRoutes,
    ]);
  });
});

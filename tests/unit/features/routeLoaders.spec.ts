import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageNames } from '@/consts';

const loadAsyncImportWithRetryMock = vi.hoisted(() => vi.fn((loader: () => Promise<unknown>) => loader()));

vi.mock('@/shared/ui/async', () => ({
  loadAsyncImportWithRetry: loadAsyncImportWithRetryMock,
}));

vi.mock('@/features/bridge/pages/BridgeContainerPage.vue', () => ({ default: { name: 'BridgeContainerPage' } }));
vi.mock('@/features/bridge/pages/BridgePage.vue', () => ({ default: { name: 'BridgePage' } }));
vi.mock('@/features/bridge/pages/BridgeTransactionsHistoryPage.vue', () => ({
  default: { name: 'BridgeTransactionsHistoryPage' },
}));
vi.mock('@/features/bridge/pages/BridgeTransactionPage.vue', () => ({ default: { name: 'BridgeTransactionPage' } }));

vi.mock('@/features/dashboard/pages/AssetOwnerContainerPage.vue', () => ({
  default: { name: 'AssetOwnerContainerPage' },
}));
vi.mock('@/features/dashboard/pages/AssetOwnerPage.vue', () => ({ default: { name: 'AssetOwnerPage' } }));
vi.mock('@/features/dashboard/pages/AssetOwnerDetailsPage.vue', () => ({
  default: { name: 'AssetOwnerDetailsPage' },
}));

vi.mock('@/features/deposit/pages/DepositOptionsPage.vue', () => ({ default: { name: 'DepositOptionsPage' } }));
vi.mock('@/features/deposit/pages/DepositTxHistoryPage.vue', () => ({ default: { name: 'DepositTxHistoryPage' } }));
vi.mock('@/features/deposit/pages/CedeStorePage.vue', () => ({ default: { name: 'CedeStorePage' } }));

vi.mock('@/features/explore/pages/ExploreContainerPage.vue', () => ({ default: { name: 'ExploreContainerPage' } }));
vi.mock('@/features/explore/pages/ExploreTokensPage.vue', () => ({ default: { name: 'ExploreTokensPage' } }));
vi.mock('@/features/explore/pages/DemeterDataContainerPage.vue', () => ({
  default: { name: 'ExploreDemeterDataContainerPage' },
}));
vi.mock('@/features/explore/pages/ExploreDemeterPage.vue', () => ({ default: { name: 'ExploreDemeterPage' } }));
vi.mock('@/features/explore/pages/PoolContainerPage.vue', () => ({ default: { name: 'ExplorePoolContainerPage' } }));
vi.mock('@/features/explore/pages/ExplorePoolsPage.vue', () => ({ default: { name: 'ExplorePoolsPage' } }));
vi.mock('@/features/explore/pages/ExploreBooksPage.vue', () => ({ default: { name: 'ExploreBooksPage' } }));

vi.mock('@/features/misc/pages/StatsPage.vue', () => ({ default: { name: 'StatsPage' } }));
vi.mock('@/features/misc/pages/OrderBookPage.vue', () => ({ default: { name: 'OrderBookPage' } }));
vi.mock('@/features/misc/pages/BurnPage.vue', () => ({ default: { name: 'BurnPage' } }));

vi.mock('@/features/pool/pages/DemeterDataContainerPage.vue', () => ({
  default: { name: 'PoolDemeterDataContainerPage' },
}));
vi.mock('@/features/pool/pages/PoolContainerPage.vue', () => ({ default: { name: 'PoolContainerPage' } }));
vi.mock('@/features/pool/pages/DemeterPoolPage.vue', () => ({ default: { name: 'DemeterPoolPage' } }));
vi.mock('@/features/pool/pages/AddLiquidityPage.vue', () => ({ default: { name: 'AddLiquidityPage' } }));

vi.mock('@/features/referrals/pages/ReferralBondingPage.vue', () => ({ default: { name: 'ReferralBondingPage' } }));

vi.mock('@/features/rewards/pages/RewardsTabsPage.vue', () => ({ default: { name: 'RewardsTabsPage' } }));
vi.mock('@/features/rewards/pages/PointSystemWrapperPage.vue', () => ({ default: { name: 'PointSystemWrapperPage' } }));
vi.mock('@/features/rewards/pages/PointSystemV2Page.vue', () => ({ default: { name: 'PointSystemV2Page' } }));
vi.mock('@/features/rewards/pages/RewardsPage.vue', () => ({ default: { name: 'RewardsPage' } }));
vi.mock('@/features/rewards/pages/ReferralProgramPage.vue', () => ({ default: { name: 'ReferralProgramPage' } }));

vi.mock('@/features/staking/pages/StakingContainerPage.vue', () => ({ default: { name: 'StakingContainerPage' } }));
vi.mock('@/features/staking/pages/StakingPage.vue', () => ({ default: { name: 'StakingPage' } }));
vi.mock('@/features/staking/pages/SoraDataContainerPage.vue', () => ({ default: { name: 'SoraDataContainerPage' } }));
vi.mock('@/features/staking/pages/SoraOverviewPage.vue', () => ({ default: { name: 'SoraOverviewPage' } }));
vi.mock('@/features/staking/pages/SoraValidatorsTypePage.vue', () => ({
  default: { name: 'SoraValidatorsTypePage' },
}));
vi.mock('@/features/staking/pages/SoraSelectValidatorsPage.vue', () => ({
  default: { name: 'SoraSelectValidatorsPage' },
}));

vi.mock('@/features/swap/pages/SwapPage.vue', () => ({ default: { name: 'SwapPage' } }));

vi.mock('@/features/vault/pages/VaultsContainerPage.vue', () => ({ default: { name: 'VaultsContainerPage' } }));
vi.mock('@/features/vault/pages/VaultsPage.vue', () => ({ default: { name: 'VaultsPage' } }));
vi.mock('@/features/vault/pages/VaultDetailsPage.vue', () => ({ default: { name: 'VaultDetailsPage' } }));

vi.mock('@/features/wallet/pages/WalletPage.vue', () => ({ default: { name: 'WalletPage' } }));

import { bridgeRoutes } from '@/features/bridge/routes';
import { dashboardRoutes } from '@/features/dashboard/routes';
import { depositRoutes } from '@/features/deposit/routes';
import { exploreRoutes } from '@/features/explore/routes';
import { miscRoutes } from '@/features/misc/routes';
import { poolRoutes } from '@/features/pool/routes';
import { referralRoutes } from '@/features/referrals/routes';
import { rewardsRoutes } from '@/features/rewards/routes';
import { stakingRoutes } from '@/features/staking/routes';
import { swapRoutes } from '@/features/swap/routes';
import { vaultRoutes } from '@/features/vault/routes';
import { walletRoutes } from '@/features/wallet/routes';

import type { RouteRecordRaw } from 'vue-router';

type LazyRoute = RouteRecordRaw & {
  component?: () => Promise<{ default: { name: string } }>;
  children?: LazyRoute[];
};

const resolveComponent = async (route: LazyRoute) => {
  expect(typeof route.component).toBe('function');
  return (route.component as NonNullable<LazyRoute['component']>)();
};

describe('feature route loaders', () => {
  beforeEach(() => {
    loadAsyncImportWithRetryMock.mockClear();
  });

  it('loads the bridge feature route components through the async import helper', async () => {
    const [bridgeRoot] = bridgeRoutes as LazyRoute[];
    const [bridgeIndex, bridgeHistory, bridgeTransaction] = bridgeRoot.children ?? [];

    await expect(resolveComponent(bridgeRoot)).resolves.toMatchObject({ default: { name: 'BridgeContainerPage' } });
    await expect(resolveComponent(bridgeIndex)).resolves.toMatchObject({ default: { name: 'BridgePage' } });
    await expect(resolveComponent(bridgeHistory)).resolves.toMatchObject({
      default: { name: 'BridgeTransactionsHistoryPage' },
    });
    await expect(resolveComponent(bridgeTransaction)).resolves.toMatchObject({
      default: { name: 'BridgeTransactionPage' },
    });
    expect(bridgeHistory.meta).toEqual({ requiresAuth: true });
    expect(bridgeTransaction.meta).toEqual({ requiresAuth: true });
    expect(loadAsyncImportWithRetryMock).toHaveBeenCalledTimes(4);
  });

  it('loads the dashboard, deposit, and wallet route components through the async import helper', async () => {
    const [dashboardOwner, dashboardRedirect] = dashboardRoutes as LazyRoute[];
    const [dashboardIndex, dashboardDetails] = dashboardOwner.children ?? [];
    const [depositOptions, depositHistory, cedeStore] = depositRoutes as LazyRoute[];
    const [walletRoute] = walletRoutes as LazyRoute[];

    await expect(resolveComponent(dashboardOwner)).resolves.toMatchObject({
      default: { name: 'AssetOwnerContainerPage' },
    });
    await expect(resolveComponent(dashboardIndex)).resolves.toMatchObject({ default: { name: 'AssetOwnerPage' } });
    await expect(resolveComponent(dashboardDetails)).resolves.toMatchObject({
      default: { name: 'AssetOwnerDetailsPage' },
    });
    expect(dashboardRedirect.redirect).toBe('/wallet');
    expect(dashboardDetails.meta).toEqual({ requiresAuth: true });

    await expect(resolveComponent(depositOptions)).resolves.toMatchObject({
      default: { name: 'DepositOptionsPage' },
    });
    await expect(resolveComponent(depositHistory)).resolves.toMatchObject({
      default: { name: 'DepositTxHistoryPage' },
    });
    await expect(resolveComponent(cedeStore)).resolves.toMatchObject({ default: { name: 'CedeStorePage' } });
    expect(depositHistory.meta).toEqual({ requiresAuth: true });

    await expect(resolveComponent(walletRoute)).resolves.toMatchObject({ default: { name: 'WalletPage' } });
    expect(loadAsyncImportWithRetryMock).toHaveBeenCalledTimes(7);
  });

  it('loads the explore and misc route components through the async import helper', async () => {
    const [exploreRoot] = exploreRoutes as LazyRoute[];
    const [exploreTokens, exploreDemeterRoot, explorePoolsRoot, exploreBooks] = exploreRoot.children ?? [];
    const [exploreStaking, exploreFarming] = exploreDemeterRoot.children ?? [];
    const [explorePoolsIndex] = explorePoolsRoot.children ?? [];
    const [statsRoute, orderBookRoute, burnRoute, catchAllRoute] = miscRoutes as LazyRoute[];

    await expect(resolveComponent(exploreRoot)).resolves.toMatchObject({
      default: { name: 'ExploreContainerPage' },
    });
    await expect(resolveComponent(exploreTokens)).resolves.toMatchObject({
      default: { name: 'ExploreTokensPage' },
    });
    await expect(resolveComponent(exploreDemeterRoot)).resolves.toMatchObject({
      default: { name: 'ExploreDemeterDataContainerPage' },
    });
    await expect(resolveComponent(exploreStaking)).resolves.toMatchObject({
      default: { name: 'ExploreDemeterPage' },
    });
    await expect(resolveComponent(exploreFarming)).resolves.toMatchObject({
      default: { name: 'ExploreDemeterPage' },
    });
    await expect(resolveComponent(explorePoolsRoot)).resolves.toMatchObject({
      default: { name: 'ExplorePoolContainerPage' },
    });
    await expect(resolveComponent(explorePoolsIndex)).resolves.toMatchObject({
      default: { name: 'ExplorePoolsPage' },
    });
    await expect(resolveComponent(exploreBooks)).resolves.toMatchObject({
      default: { name: 'ExploreBooksPage' },
    });
    expect(exploreRoot.redirect).toEqual({ name: PageNames.ExploreTokens });
    expect(exploreStaking.props).toEqual({ isFarmingPage: false });
    expect(exploreFarming.props).toEqual({ isFarmingPage: true });

    await expect(resolveComponent(statsRoute)).resolves.toMatchObject({ default: { name: 'StatsPage' } });
    await expect(resolveComponent(orderBookRoute)).resolves.toMatchObject({ default: { name: 'OrderBookPage' } });
    await expect(resolveComponent(burnRoute)).resolves.toMatchObject({ default: { name: 'BurnPage' } });
    expect(catchAllRoute.redirect).toBe('/swap');
    expect(loadAsyncImportWithRetryMock).toHaveBeenCalledTimes(11);
  });

  it('loads the pool, referral, rewards, and swap route components through the async import helper', async () => {
    const [poolRoot] = poolRoutes as LazyRoute[];
    const [poolContainerRoute] = poolRoot.children ?? [];
    const [poolIndex, addLiquidity] = poolContainerRoute.children ?? [];
    const [referralBonding, referralUnbonding] = referralRoutes as LazyRoute[];
    const [rewardsRoot] = rewardsRoutes as LazyRoute[];
    const [pointsRoute, rewardsRoute, referralProgramRoute] = rewardsRoot.children ?? [];
    const [, swapRoute] = swapRoutes as LazyRoute[];

    await expect(resolveComponent(poolRoot)).resolves.toMatchObject({
      default: { name: 'PoolDemeterDataContainerPage' },
    });
    await expect(resolveComponent(poolContainerRoute)).resolves.toMatchObject({
      default: { name: 'PoolContainerPage' },
    });
    await expect(resolveComponent(poolIndex)).resolves.toMatchObject({
      default: { name: 'DemeterPoolPage' },
    });
    await expect(resolveComponent(addLiquidity)).resolves.toMatchObject({
      default: { name: 'AddLiquidityPage' },
    });
    expect(poolIndex.props).toEqual({ isFarmingPage: true });
    expect(addLiquidity.meta).toEqual({ requiresAuth: true });

    await expect(resolveComponent(referralBonding)).resolves.toMatchObject({
      default: { name: 'ReferralBondingPage' },
    });
    await expect(resolveComponent(referralUnbonding)).resolves.toMatchObject({
      default: { name: 'ReferralBondingPage' },
    });
    expect(referralBonding.meta).toEqual({ requiresAuth: true });
    expect(referralUnbonding.meta).toEqual({ requiresAuth: true });

    await expect(resolveComponent(rewardsRoot)).resolves.toMatchObject({
      default: { name: 'RewardsTabsPage' },
    });
    await expect(resolveComponent(pointsRoute)).resolves.toMatchObject({
      default: { name: 'PointSystemWrapperPage' },
    });
    await expect(resolveComponent(rewardsRoute)).resolves.toMatchObject({
      default: { name: 'RewardsPage' },
    });
    await expect(resolveComponent(referralProgramRoute)).resolves.toMatchObject({
      default: { name: 'ReferralProgramPage' },
    });
    expect(referralProgramRoute.meta).toEqual({ isInvitationRoute: true });

    expect(swapRoutes[0]?.redirect).toBe('/swap');
    await expect(resolveComponent(swapRoute)).resolves.toMatchObject({ default: { name: 'SwapPage' } });
    expect(loadAsyncImportWithRetryMock).toHaveBeenCalledTimes(11);
  });

  it('loads the staking and vault route components through the async import helper', async () => {
    const [stakingRoot, soraRoot] = stakingRoutes as LazyRoute[];
    const [stakingList] = stakingRoot.children ?? [];
    const [soraOverview, soraValidatorsType, soraSelectValidators] = soraRoot.children ?? [];
    const [vaultRoot] = vaultRoutes as LazyRoute[];
    const [vaultIndex, vaultDetails] = vaultRoot.children ?? [];

    await expect(resolveComponent(stakingRoot)).resolves.toMatchObject({
      default: { name: 'StakingContainerPage' },
    });
    await expect(resolveComponent(stakingList)).resolves.toMatchObject({ default: { name: 'StakingPage' } });
    await expect(resolveComponent(soraRoot)).resolves.toMatchObject({
      default: { name: 'SoraDataContainerPage' },
    });
    await expect(resolveComponent(soraOverview)).resolves.toMatchObject({
      default: { name: 'SoraOverviewPage' },
    });
    await expect(resolveComponent(soraValidatorsType)).resolves.toMatchObject({
      default: { name: 'SoraValidatorsTypePage' },
    });
    await expect(resolveComponent(soraSelectValidators)).resolves.toMatchObject({
      default: { name: 'SoraSelectValidatorsPage' },
    });
    expect(stakingRoot.redirect).toEqual({ name: 'Staking' });
    expect(stakingList.props).toEqual({ isFarmingPage: false });

    await expect(resolveComponent(vaultRoot)).resolves.toMatchObject({
      default: { name: 'VaultsContainerPage' },
    });
    await expect(resolveComponent(vaultIndex)).resolves.toMatchObject({ default: { name: 'VaultsPage' } });
    await expect(resolveComponent(vaultDetails)).resolves.toMatchObject({
      default: { name: 'VaultDetailsPage' },
    });
    expect(vaultDetails.meta).toEqual({ requiresAuth: true });
    expect(loadAsyncImportWithRetryMock).toHaveBeenCalledTimes(9);
  });
});

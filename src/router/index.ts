import { WALLET_CONSTS } from '@wallet';
import { defineAsyncComponent } from 'vue';
import { Vue as VueComponent } from 'vue-property-decorator';
import { createRouter, createWebHashHistory } from 'vue-router';

import { setLegacyRouterLoading, syncLegacyRoute } from '@/adapters/router/navigation';
import { isValidWalletAddress } from '@/adapters/wallet/addresses';
import { persistReferralAddress } from '@/adapters/wallet/referrals';
import { PageNames } from '@/consts';
import { resolveAuthRedirect, resolveInvitationDecision, shouldResetBridgeHistory } from '@/router/guards/decisions';
import { DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyView } from '@/modules/dashboard/router';
import { PoolPageNames } from '@/modules/pool/consts';
import { poolLazyView } from '@/modules/pool/router';
import { StakingPageNames } from '@/modules/staking/consts';
import { DemeterStakingPageNames } from '@/modules/staking/demeter/consts';
import { demeterStakingLazyView, soraStakingLazyView, stakingLazyView } from '@/modules/staking/router';
import { SoraStakingPageNames } from '@/modules/staking/sora/consts';
import { VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyView } from '@/modules/vault/router';
import { useBridgeHistoryStore } from '@/stores/bridge/history';
import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';
import { updateDocumentTitle } from '@/utils';

import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';

if (typeof (VueComponent as { registerHooks?: (hooks: string[]) => void }).registerHooks === 'function') {
  VueComponent.registerHooks(['beforeRouteEnter', 'beforeRouteUpdate', 'beforeRouteLeave']);
}

const createAsyncComponent = <T>(loader: () => Promise<T>) =>
  defineAsyncComponent({
    loader,
    delay: 0,
    suspensible: false,
  });

const lazyComponent = (name: string) => createAsyncComponent(() => import(`@/components/${name}.vue`));
const lazyView = (name: string) => () => import(`@/views/${name}.vue`);

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/swap',
  },
  {
    path: '/swap/:first?/:second?',
    name: PageNames.Swap,
    component: lazyView(PageNames.Swap),
  },
  {
    path: '/wallet',
    name: PageNames.Wallet,
    component: lazyView(PageNames.Wallet),
  },
  // {
  //   path: '/card',
  //   name: PageNames.SoraCard,
  //   component: lazyView(PageNames.SoraCard),
  // },
  {
    path: '/bridge',
    component: lazyView(PageNames.BridgeContainer),
    children: [
      {
        path: '',
        name: PageNames.Bridge,
        component: lazyView(PageNames.Bridge),
      },
      {
        path: 'history',
        name: PageNames.BridgeTransactionsHistory,
        component: lazyView(PageNames.BridgeTransactionsHistory),
        meta: { requiresAuth: true },
      },
      {
        path: 'transaction',
        name: PageNames.BridgeTransaction,
        component: lazyView(PageNames.BridgeTransaction),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '',
    component: demeterStakingLazyView(DemeterStakingPageNames.DataContainer),
    children: [
      {
        path: '/pool',
        component: poolLazyView(PoolPageNames.PoolContainer),
        children: [
          {
            path: '',
            name: DemeterStakingPageNames.Pool,
            component: demeterStakingLazyView(DemeterStakingPageNames.Pool),
            props: { isFarmingPage: true },
          },
          {
            path: 'add/:first?/:second?',
            name: PageNames.AddLiquidity,
            component: lazyView(PageNames.AddLiquidity),
            meta: { requiresAuth: true },
          },
        ],
      },
      {
        path: '/staking',
        name: PageNames.StakingContainer,
        component: lazyView(PageNames.StakingContainer),
        redirect: { name: StakingPageNames.Staking },
        children: [
          {
            path: 'list',
            name: StakingPageNames.Staking,
            component: stakingLazyView(StakingPageNames.Staking),
            props: { isFarmingPage: false },
          },
        ],
      },
    ],
  },
  {
    path: '',
    component: soraStakingLazyView(SoraStakingPageNames.DataContainer),
    children: [
      {
        path: '/staking/sora',
        name: SoraStakingPageNames.Overview,
        component: soraStakingLazyView(SoraStakingPageNames.Overview),
      },
      {
        path: '/staking/sora/validators/type',
        name: SoraStakingPageNames.ValidatorsType,
        component: soraStakingLazyView(SoraStakingPageNames.ValidatorsType),
      },
      {
        path: '/staking/sora/validators/select',
        name: SoraStakingPageNames.SelectValidators,
        component: soraStakingLazyView(SoraStakingPageNames.SelectValidators),
      },
    ],
  },
  {
    path: '/explore',
    name: PageNames.ExploreContainer,
    component: lazyView(PageNames.ExploreContainer),
    redirect: { name: PageNames.ExploreTokens },
    children: [
      {
        path: 'tokens',
        name: PageNames.ExploreTokens,
        component: lazyView(PageNames.ExploreTokens),
      },
      {
        path: 'demeter',
        component: demeterStakingLazyView(DemeterStakingPageNames.DataContainer),
        children: [
          {
            path: 'staking',
            name: PageNames.ExploreStaking,
            component: lazyView(PageNames.ExploreDemeter),
            props: { isFarmingPage: false },
          },
          {
            path: 'farming',
            name: PageNames.ExploreFarming,
            component: lazyView(PageNames.ExploreDemeter),
            props: { isFarmingPage: true },
          },
        ],
      },
      {
        path: 'pools',
        component: poolLazyView(PoolPageNames.PoolContainer),
        children: [
          {
            path: '',
            name: PageNames.ExplorePools,
            component: lazyView(PageNames.ExplorePools),
          },
        ],
      },
      {
        path: 'books',
        name: PageNames.ExploreBooks,
        component: lazyView(PageNames.ExploreBooks),
      },
    ],
  },
  {
    path: '',
    component: lazyView(PageNames.RewardsTabs),
    children: [
      {
        path: '/points',
        name: PageNames.PointSystemWrapper,
        component: lazyView(PageNames.PointSystemWrapper),
      },
      {
        path: '/rewards',
        name: PageNames.Rewards,
        component: lazyView(PageNames.Rewards),
      },
      {
        path: '/referral/:referrerAddress?',
        name: PageNames.ReferralProgram,
        component: lazyView(PageNames.ReferralProgram),
        meta: {
          isInvitationRoute: true,
        },
      },
    ],
  },
  {
    path: '/referral/bond',
    name: PageNames.ReferralBonding,
    component: lazyView(PageNames.ReferralBonding),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/referral/unbond',
    name: PageNames.ReferralUnbonding,
    component: lazyView(PageNames.ReferralBonding),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/deposit',
    name: PageNames.DepositOptions,
    component: lazyView(PageNames.DepositOptions),
  },
  {
    path: '/deposit/history',
    name: PageNames.DepositTxHistory,
    component: lazyView(PageNames.DepositTxHistory),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/deposit/transfer-from-cex',
    name: PageNames.CedeStore,
    component: lazyView(PageNames.CedeStore),
  },
  {
    path: '/kensetsu',
    component: vaultLazyView(VaultPageNames.VaultsContainer),
    children: [
      {
        path: '',
        name: VaultPageNames.Vaults,
        component: vaultLazyView(VaultPageNames.Vaults),
      },
      {
        path: ':vault',
        name: VaultPageNames.VaultDetails,
        component: vaultLazyView(VaultPageNames.VaultDetails),
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/dashboard/owner',
    component: lazyView(PageNames.AssetOwnerContainer),
    children: [
      {
        path: '',
        name: DashboardPageNames.AssetOwner,
        component: dashboardLazyView(DashboardPageNames.AssetOwner),
      },
      {
        path: ':asset',
        name: DashboardPageNames.AssetOwnerDetails,
        component: dashboardLazyView(DashboardPageNames.AssetOwnerDetails),
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/dashboard',
    redirect: '/wallet',
  },
  {
    path: '/stats',
    name: PageNames.Stats,
    component: lazyView(PageNames.Stats),
  },
  {
    path: '/trade/:first?/:second?',
    name: PageNames.OrderBook,
    component: lazyView(PageNames.OrderBook),
  },
  {
    path: '/burn',
    name: PageNames.Burn,
    component: lazyView(PageNames.Burn),
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/swap',
  },
];

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet;

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next) => {
  const prev = from.name as Nullable<PageNames>;
  const current = to.name as PageNames;
  const routerStore = useRouterStore();
  const walletStore = useWalletStore();
  const bridgeHistoryStore = useBridgeHistoryStore();
  const setRoute = (name: PageNames, withNext = true) => {
    const params = { prev, current: name };
    routerStore.setRoute(params);
    syncLegacyRoute(params);
    next(withNext ? { name } : undefined);
    updateDocumentTitle(to);
  };
  const isLoggedIn = walletStore.isLoggedIn;
  const isInvitationRoute = to.matched.some((record) => record.meta.isInvitationRoute);
  const isRequiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (shouldResetBridgeHistory(prev, current)) {
    bridgeHistoryStore.resetHistoryPage();
  }

  const invitationDecision = resolveInvitationDecision({
    isInvitationRoute,
    referrerParam: to.params.referrerAddress,
    isLoggedIn,
    validateAddress: isValidWalletAddress,
  });

  if (invitationDecision.persistReferral) {
    persistReferralAddress(invitationDecision.persistReferral);
  }

  if (invitationDecision.redirect) {
    setRoute(invitationDecision.redirect.name, invitationDecision.redirect.callNext);
    return;
  }

  const authRedirect = resolveAuthRedirect({
    requiresAuth: isRequiresAuth,
    current,
    isLoggedIn,
  });

  if (authRedirect) {
    setRoute(authRedirect.name, authRedirect.callNext);
    return;
  }
  setRoute(current, false);
});

/**
 * Use this function instead just `router.push` when page loading is required.
 *
 * It checks wallet routing, page loading and the current route.
 * if the current route isn't the same as param, then it will wait for `router.push`
 */
const goTo = async (name: PageNames): Promise<void> => {
  const current = router.currentRoute.value?.name as PageNames | undefined;
  const routerStore = useRouterStore();
  const walletStore = useWalletStore();
  if (name === PageNames.Wallet) {
    if (!walletStore.isLoggedIn) {
      routerStore.navigate({ name: WALLET_CONSTS.RouteNames.WalletConnection });
    } else if (routerStore.current !== WALLET_DEFAULT_ROUTE) {
      routerStore.navigate({ name: WALLET_DEFAULT_ROUTE });
    }
  }
  if (current === name) {
    return;
  }
  try {
    routerStore.setLoading(true);
    setLegacyRouterLoading(true);
    await router.push({ name });
  } finally {
    routerStore.setLoading(false);
    setLegacyRouterLoading(false);
  }
};

export { lazyComponent, lazyView, goTo };
export default router;

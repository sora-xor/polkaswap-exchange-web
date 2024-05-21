import { WALLET_CONSTS, api } from '@soramitsu/soraneo-wallet-web';
import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import VueRouter, { RouteConfig } from 'vue-router';

import { PageNames, BridgeChildPages } from '@/consts';
import { DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyView } from '@/modules/dashboard/router';
import { StakingPageNames } from '@/modules/staking/consts';
import { DemeterStakingPageNames } from '@/modules/staking/demeter/consts';
import { demeterStakingLazyView, soraStakingLazyView, stakingLazyView } from '@/modules/staking/router';
import { SoraStakingPageNames } from '@/modules/staking/sora/consts';
import { VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyView } from '@/modules/vault/router';
import store from '@/store';
import { updateDocumentTitle } from '@/utils';

Vue.use(VueRouter);

Component.registerHooks(['beforeRouteEnter', 'beforeRouteUpdate', 'beforeRouteLeave']);

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet;

const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`);
const lazyView = (name: string) => () => import(`@/views/${name}.vue`);

/**
 * Use this function instead just `router.push` when page loading is required.
 *
 * It checks wallet routing, page loading and the current route.
 * if the current route isn't the same as param, then it will wait for `router.push`
 */
async function goTo(name: PageNames): Promise<void> {
  const current = router.currentRoute.name;
  if (name === PageNames.Wallet) {
    if (!store.getters.wallet.account.isLoggedIn) {
      store.commit.wallet.router.navigate({ name: WALLET_CONSTS.RouteNames.WalletConnection });
    } else if (store.state.wallet.router.currentRoute !== WALLET_DEFAULT_ROUTE) {
      store.commit.wallet.router.navigate({ name: WALLET_DEFAULT_ROUTE });
    }
  }
  if (current === name) {
    return;
  }
  try {
    store.commit.router.setLoading(true);
    await router.push({ name });
  } finally {
    store.commit.router.setLoading(false);
  }
}

const routes: Array<RouteConfig> = [
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
    path: '/about',
    name: PageNames.About,
    component: lazyView(PageNames.About),
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
        component: lazyView(PageNames.PoolContainer),
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
          {
            path: 'remove/:first/:second',
            name: PageNames.RemoveLiquidity,
            component: lazyView(PageNames.RemoveLiquidity),
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
        component: lazyView(PageNames.PoolContainer),
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
    path: '/rewards',
    component: lazyView(PageNames.RewardsTabs),
    children: [
      {
        path: '',
        name: PageNames.Rewards,
        component: lazyView(PageNames.Rewards),
      },
      {
        path: '/referral', // because of leading slash, path will be absolute: #/referral
        name: PageNames.ReferralProgram,
        component: lazyView(PageNames.ReferralProgram),
        children: [
          {
            path: ':referrerAddress?',
            meta: {
              isInvitationRoute: true,
              requiresAuth: true,
            },
          },
        ],
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
    path: '/fiat-deposit',
    name: PageNames.FiatDepositOptions,
    component: lazyView(PageNames.FiatDepositOptions),
  },
  {
    path: '/fiat-deposit/history',
    name: PageNames.FiatTxHistory,
    component: lazyView(PageNames.FiatTxHistory),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/kensetsu',
    component: lazyView(PageNames.VaultsContainer),
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
    path: '*',
    redirect: '/swap',
  },
];

const router = new VueRouter({
  mode: 'hash',
  routes,
});

router.beforeEach((to, from, next) => {
  const prev = from.name as Nullable<PageNames>;
  const current = to.name as PageNames;
  const setRoute = (name: PageNames, withNext = true) => {
    store.commit.router.setRoute({ prev, current: name });
    next(withNext ? { name } : undefined);
    updateDocumentTitle(to);
  };
  const isLoggedIn = store.getters.wallet.account.isLoggedIn;
  if (prev !== PageNames.BridgeTransaction && current === PageNames.BridgeTransactionsHistory) {
    store.commit.bridge.setHistoryPage(1);
  }
  if (to.matched.some((record) => record.meta.isInvitationRoute)) {
    if (api.validateAddress(to.params.referrerAddress)) {
      store.commit.referrals.setStorageReferrer(to.params.referrerAddress);
    }
    if (isLoggedIn) {
      setRoute(PageNames.ReferralProgram);
      return;
    }
  }
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (BridgeChildPages.includes(current) && isLoggedIn && !store.getters.bridge.externalAccount) {
      setRoute(PageNames.Bridge);
      return;
    }
    if (!isLoggedIn) {
      setRoute(PageNames.Wallet);
      return;
    }
  }
  setRoute(current, false);
});

export { lazyComponent, lazyView, goTo };
export default router;

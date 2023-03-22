import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import { Component } from 'vue-property-decorator';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { api } from '@sora-substrate/util';

import store from '@/store';
import { updateDocumentTitle } from '@/utils';
import { PageNames, BridgeChildPages } from '@/consts';

import { DemeterPageNames } from '@/modules/demeterFarming/consts';
import { demeterLazyView } from '@/modules/demeterFarming/router';

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
  {
    path: '/card',
    name: PageNames.SoraCard,
    component: lazyView(PageNames.SoraCard),
  },
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
    path: '/pool',
    component: lazyView(PageNames.PoolContainer),
    children: [
      {
        path: '',
        component: demeterLazyView(DemeterPageNames.DataContainer),
        children: [
          {
            path: '',
            name: DemeterPageNames.Pool,
            component: demeterLazyView(DemeterPageNames.Pool),
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
    ],
  },
  {
    path: '/staking',
    name: PageNames.StakingContainer,
    component: lazyView(PageNames.StakingContainer),
    redirect: { name: DemeterPageNames.Staking },
    children: [
      {
        path: 'demeter',
        component: demeterLazyView(DemeterPageNames.DataContainer),
        children: [
          {
            path: '',
            name: DemeterPageNames.Staking,
            component: demeterLazyView(DemeterPageNames.Staking),
            props: { isFarmingPage: false },
          },
        ],
      },
    ],
  },
  {
    path: '/explore',
    name: PageNames.ExploreContainer,
    component: lazyView(PageNames.ExploreContainer),
    redirect: { name: PageNames.ExploreFarming },
    children: [
      {
        path: 'demeter',
        component: demeterLazyView(DemeterPageNames.DataContainer),
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
        path: 'tokens',
        name: PageNames.ExploreTokens,
        component: lazyView(PageNames.ExploreTokens),
      },
    ],
  },
  {
    path: '/rewards',
    name: PageNames.Rewards,
    component: lazyView(PageNames.RewardsTabs),
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
    path: '/referral',
    name: PageNames.ReferralProgram,
    component: lazyView(PageNames.RewardsTabs),
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
  {
    path: '/moonpay-history',
    name: PageNames.MoonpayHistory,
    component: lazyView(PageNames.MoonpayHistory),
    meta: { requiresAuth: true },
  },
  {
    path: '/stats',
    name: PageNames.Stats,
    component: lazyView(PageNames.Stats),
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
  console.info('router.beforeEach');
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
    if (BridgeChildPages.includes(current) && isLoggedIn && !store.getters.web3.isExternalAccountConnected) {
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

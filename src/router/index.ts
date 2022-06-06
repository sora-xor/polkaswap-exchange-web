import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { api } from '@sora-substrate/util';

import { PageNames, BridgeChildPages } from '@/consts';
import store from '@/store';

Vue.use(VueRouter);

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet;

const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`);
const lazyView = (name: string) => () => import(`@/views/${name}.vue`);

function goTo(name: PageNames): void {
  if (name === PageNames.Wallet) {
    if (!store.getters.wallet.account.isLoggedIn) {
      store.commit.wallet.router.navigate({ name: WALLET_CONSTS.RouteNames.WalletConnection });
    } else if (store.state.wallet.router.currentRoute !== WALLET_DEFAULT_ROUTE) {
      store.commit.wallet.router.navigate({ name: WALLET_DEFAULT_ROUTE });
    }
  }
  if (router.currentRoute.name === name) {
    return;
  }
  router.push({ name });
}

const routes: Array<RouteConfig> = [
  {
    path: '/',
    redirect: '/swap',
  },
  {
    path: '/swap',
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
        component: lazyView(PageNames.DemeterDataContainer),
        children: [
          {
            path: '',
            name: PageNames.Pool,
            component: lazyView(PageNames.DemeterPool),
          },
          {
            path: 'create-pair',
            name: PageNames.CreatePair,
            component: lazyView(PageNames.CreatePair),
            meta: { requiresAuth: true },
          },
          {
            path: 'add/:firstAddress?/:secondAddress?',
            name: PageNames.AddLiquidity,
            component: lazyView(PageNames.AddLiquidity),
            meta: { requiresAuth: true },
          },
          {
            path: 'remove/:firstAddress/:secondAddress',
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
    redirect: { name: PageNames.DemeterStaking },
    children: [
      {
        path: 'demeter',
        component: lazyView(PageNames.DemeterDataContainer),
        children: [
          {
            path: '',
            name: PageNames.DemeterStaking,
            component: lazyView(PageNames.DemeterStaking),
          },
        ],
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
    name: PageNames.Referral,
    component: lazyView(PageNames.RewardsTabs),
    meta: { isReferralProgram: true },
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
    path: '/tokens',
    name: PageNames.Tokens,
    component: lazyView(PageNames.Tokens),
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
  },
  {
    path: '/support',
    name: PageNames.Support,
  },
  {
    path: '*',
    redirect: '/swap',
    // TODO: Turn on redirect to PageNotFound
    // name: PageNames.PageNotFound,
    // component: lazyComponent(PageNames.PageNotFound)
  },
];

const router = new VueRouter({
  mode: 'hash',
  routes,
});

router.beforeEach((to, from, next) => {
  const prev = from.name as Nullable<PageNames>;
  const isLoggedIn = store.getters.wallet.account.isLoggedIn;
  if (to.matched.some((record) => record.meta.isInvitationRoute)) {
    if (api.validateAddress(to.params.referrerAddress)) {
      store.commit.referrals.setStorageReferrer(to.params.referrerAddress);
    }
    if (isLoggedIn) {
      next({ name: PageNames.Referral });
      store.commit.router.setRoute({ prev, current: PageNames.Referral });
      return;
    }
  }
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (
      BridgeChildPages.includes(to.name as PageNames) &&
      isLoggedIn &&
      !store.getters.web3.isExternalAccountConnected
    ) {
      next({ name: PageNames.Bridge });
      store.commit.router.setRoute({ prev, current: PageNames.Bridge });
      return;
    }
    if (!isLoggedIn) {
      next({ name: PageNames.Wallet });
      store.commit.router.setRoute({ prev, current: PageNames.Wallet });
      return;
    }
  }
  store.commit.router.setRoute({ prev, current: to.name as PageNames });
  next();
});

export { lazyComponent, lazyView, goTo };
export default router;

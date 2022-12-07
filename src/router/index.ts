import Vue from 'vue';
import VueRouter, { NavigationGuardNext, RouteConfig } from 'vue-router';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { api } from '@sora-substrate/util';

import store from '@/store';
import { updateDocumentTitle } from '@/utils';
import { PageNames, BridgeChildPages } from '@/consts';

import { DemeterPageNames } from '@/modules/demeterFarming/consts';
import { demeterLazyView } from '@/modules/demeterFarming/router';

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
      setRoute(PageNames.Referral);
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
  if (!store.getters.settings.soraCardEnabled && to.name === PageNames.SoraCard) {
    setRoute(PageNames.Swap);
    return;
  }
  setRoute(current, false);
});

export { lazyComponent, lazyView, goTo };
export default router;

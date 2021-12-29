import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { PageNames, BridgeChildPages, LayoutNames } from '@/consts';
import store from '@/store';

Vue.use(VueRouter);

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet;

const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`);
const lazyView = (name: string) => () => import(`@/views/${name}.vue`);
const lazyLayout = (name: string) => () => import(`@/layouts/${name}.vue`);

function goTo(name: PageNames): void {
  if (name === PageNames.Wallet) {
    if (!store.getters.isLoggedIn) {
      store.dispatch('navigate', { name: WALLET_CONSTS.RouteNames.WalletConnection });
    } else if (store.getters.currentRoute !== WALLET_DEFAULT_ROUTE) {
      store.dispatch('navigate', { name: WALLET_DEFAULT_ROUTE });
    }
  }
  if (router.currentRoute.name === name) {
    return;
  }
  router.push({ name });
}

function showTechnicalWork(): void {
  goTo(PageNames.TechnicalWork);
}

const routes: Array<RouteConfig> = [
  {
    path: '/technical-work',
    name: PageNames.TechnicalWork,
    component: lazyView(PageNames.TechnicalWork),
  },
  {
    path: '*',
    redirect: '/swap',
    // TODO: Turn on redirect to PageNotFound
    // name: PageNames.PageNotFound,
    // component: lazyComponent(PageNames.PageNotFound)
  },
  {
    path: '/',
    redirect: '/swap',
    component: lazyLayout(LayoutNames.App),
    children: [
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
        name: PageNames.Bridge,
        component: lazyView(PageNames.Bridge),
      },
      {
        path: '/bridge/transaction',
        name: PageNames.BridgeTransaction,
        component: lazyView(PageNames.BridgeTransaction),
        meta: { requiresAuth: true },
      },
      {
        path: '/bridge/history',
        name: PageNames.BridgeTransactionsHistory,
        component: lazyView(PageNames.BridgeTransactionsHistory),
        meta: { requiresAuth: true },
      },
      {
        path: '/pool',
        component: lazyView(PageNames.PoolContainer),
        children: [
          {
            path: '',
            name: PageNames.Pool,
            component: lazyView(PageNames.Pool),
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
      {
        path: '/rewards',
        name: PageNames.Rewards,
        component: lazyView(PageNames.Rewards),
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
    ],
  },
];

const router = new VueRouter({
  mode: 'hash',
  routes,
});

router.beforeEach((to, from, next) => {
  const prev = from.name;
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (
      BridgeChildPages.includes(to.name as PageNames) &&
      store.getters.isLoggedIn &&
      !store.getters['web3/isExternalAccountConnected']
    ) {
      next({ name: PageNames.Bridge });
      store.dispatch('router/setRoute', { prev, current: PageNames.Bridge });
      return;
    }
    if (!store.getters.isLoggedIn) {
      next({ name: PageNames.Wallet });
      store.dispatch('router/setRoute', { prev, current: PageNames.Wallet });
      return;
    }
  }
  store.dispatch('router/setRoute', { prev, current: to.name });
  next();
});

export { lazyComponent, lazyView, lazyLayout, goTo, showTechnicalWork };
export default router;

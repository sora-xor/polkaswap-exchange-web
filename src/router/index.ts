import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { PageNames } from '@/consts';
import store from '@/store';

Vue.use(VueRouter);

const WALLET_DEFAULT_ROUTE = WALLET_CONSTS.RouteNames.Wallet;

const lazyComponent = (name: string) => () => import(`@/components/${name}.vue`);
const lazyView = (name: string) => () => import(`@/views/${name}.vue`);

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
    path: '/wallet',
    name: PageNames.Wallet,
    component: lazyView(PageNames.Wallet),
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
  const prev = from.name;
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!store.getters.isLoggedIn) {
      next({ name: PageNames.Wallet });
      store.dispatch('router/setRoute', { prev, current: PageNames.Wallet });
      return;
    }
  }
  store.dispatch('router/setRoute', { prev, current: to.name });
  next();
});

export { lazyComponent, lazyView, goTo };
export default router;

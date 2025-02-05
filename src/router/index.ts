import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import VueRouter from 'vue-router';

import { PageNames } from '@/consts';
import store from '@/store';
import { updateDocumentTitle } from '@/utils';

import type { RouteConfig } from 'vue-router';

Vue.use(VueRouter);

Component.registerHooks(['beforeRouteEnter', 'beforeRouteUpdate', 'beforeRouteLeave']);

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
    redirect: '/bridge',
  },
  {
    path: '*',
    redirect: '/bridge',
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
  const isRequiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (prev !== PageNames.BridgeTransaction && current === PageNames.BridgeTransactionsHistory) {
    store.commit.bridge.setHistoryPage(1);
  }
  if (isRequiresAuth && !isLoggedIn) {
    setRoute(PageNames.Bridge);
    return;
  }
  setRoute(current, false);
});

export { lazyComponent, lazyView, goTo };
export default router;

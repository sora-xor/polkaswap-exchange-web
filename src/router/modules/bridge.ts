import { PageNames } from '@/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const bridgeRoutes: RouteRecordRaw[] = [
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
        path: 'sccp',
        name: PageNames.Sccp,
        component: lazyView(PageNames.Sccp),
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

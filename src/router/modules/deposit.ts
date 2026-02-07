import { PageNames } from '@/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const depositRoutes: RouteRecordRaw[] = [
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
];

import { PageNames } from '@/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const miscRoutes: RouteRecordRaw[] = [
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

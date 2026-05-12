import { PageNames } from '@/consts/navigation';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const miscRoutes: RouteRecordRaw[] = [
  {
    path: '/stats',
    name: PageNames.Stats,
    component: () => loadAsyncImportWithRetry(() => import('./pages/StatsPage.vue')),
  },
  {
    path: '/trade/:first?/:second?',
    name: PageNames.OrderBook,
    component: () => loadAsyncImportWithRetry(() => import('./pages/OrderBookPage.vue')),
  },
  {
    path: '/burn',
    name: PageNames.Burn,
    component: () => loadAsyncImportWithRetry(() => import('./pages/BurnPage.vue')),
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/swap',
  },
];

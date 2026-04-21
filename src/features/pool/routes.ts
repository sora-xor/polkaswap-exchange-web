import { PageNames } from '@/consts';
import { PoolPageNames } from '@/features/pool/consts';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const poolRoutes: RouteRecordRaw[] = [
  {
    path: '',
    component: () => loadAsyncImportWithRetry(() => import('./pages/DemeterDataContainerPage.vue')),
    children: [
      {
        path: '/pool',
        component: () => loadAsyncImportWithRetry(() => import('./pages/PoolContainerPage.vue')),
        children: [
          {
            path: '',
            name: PoolPageNames.Pool,
            component: () => loadAsyncImportWithRetry(() => import('./pages/DemeterPoolPage.vue')),
            props: { isFarmingPage: true },
          },
          {
            path: 'add/:first?/:second?',
            name: PageNames.AddLiquidity,
            component: () => loadAsyncImportWithRetry(() => import('./pages/AddLiquidityPage.vue')),
            meta: { requiresAuth: true },
          },
        ],
      },
    ],
  },
];

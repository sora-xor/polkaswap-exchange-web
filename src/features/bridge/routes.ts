import { PageNames } from '@/consts/navigation';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const bridgeRoutes: RouteRecordRaw[] = [
  {
    path: '/bridge',
    component: () => loadAsyncImportWithRetry(() => import('./pages/BridgeContainerPage.vue')),
    children: [
      {
        path: '',
        name: PageNames.Bridge,
        component: () => loadAsyncImportWithRetry(() => import('./pages/BridgePage.vue')),
      },
      {
        path: 'history',
        name: PageNames.BridgeTransactionsHistory,
        component: () => loadAsyncImportWithRetry(() => import('./pages/BridgeTransactionsHistoryPage.vue')),
        meta: { requiresAuth: true },
      },
      {
        path: 'transaction',
        name: PageNames.BridgeTransaction,
        component: () => loadAsyncImportWithRetry(() => import('./pages/BridgeTransactionPage.vue')),
        meta: { requiresAuth: true },
      },
    ],
  },
];

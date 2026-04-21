import { PageNames } from '@/consts';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const depositRoutes: RouteRecordRaw[] = [
  {
    path: '/deposit',
    name: PageNames.DepositOptions,
    component: () => loadAsyncImportWithRetry(() => import('./pages/DepositOptionsPage.vue')),
  },
  {
    path: '/deposit/history',
    name: PageNames.DepositTxHistory,
    component: () => loadAsyncImportWithRetry(() => import('./pages/DepositTxHistoryPage.vue')),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/deposit/transfer-from-cex',
    name: PageNames.CedeStore,
    component: () => loadAsyncImportWithRetry(() => import('./pages/CedeStorePage.vue')),
  },
];

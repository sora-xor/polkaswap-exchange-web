import { PageNames } from '@/consts';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const walletRoutes: RouteRecordRaw[] = [
  {
    path: '/wallet',
    name: PageNames.Wallet,
    component: () => loadAsyncImportWithRetry(() => import('./pages/WalletPage.vue')),
  },
];

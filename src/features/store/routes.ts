import type { RouteRecordRaw } from 'vue-router';

import { PageNames } from '@/consts/navigation';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

/** Static/IPFS-compatible entry point for the volunteer community store. */
export const storeRoutes: RouteRecordRaw[] = [
  {
    path: '/store',
    name: PageNames.Store,
    component: () => loadAsyncImportWithRetry(() => import('./pages/StorePage.vue')),
  },
];

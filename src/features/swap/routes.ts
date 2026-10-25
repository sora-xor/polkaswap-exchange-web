import { PageNames } from '@/consts/navigation';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

const loadSwapPage = () => loadAsyncImportWithRetry(() => import('./pages/SwapPage.vue'));

/**
 * Swap feature public routes. URL contracts are preserved while the internal
 * implementation moves behind the feature boundary.
 */
export const swapRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/swap',
  },
  {
    path: '/swap/:first?/:second?',
    name: PageNames.Swap,
    component: loadSwapPage,
  },
];

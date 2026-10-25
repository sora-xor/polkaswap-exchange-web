import { PageNames } from '@/consts';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const polkamarktRoutes: RouteRecordRaw[] = [
  {
    path: '/polkamarkt/:marketId?',
    name: PageNames.Polkamarkt,
    component: () => loadAsyncImportWithRetry(() => import('./pages/PolkamarktPage.vue')),
  },
];

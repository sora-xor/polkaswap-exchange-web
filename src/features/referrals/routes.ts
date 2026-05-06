import { PageNames } from '@/consts';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const referralRoutes: RouteRecordRaw[] = [
  {
    path: '/referral/bond',
    name: PageNames.ReferralBonding,
    component: () => loadAsyncImportWithRetry(() => import('./pages/ReferralBondingPage.vue')),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/referral/unbond',
    name: PageNames.ReferralUnbonding,
    component: () => loadAsyncImportWithRetry(() => import('./pages/ReferralBondingPage.vue')),
    meta: {
      requiresAuth: true,
    },
  },
];

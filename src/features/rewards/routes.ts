import { PageNames } from '@/consts/navigation';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const rewardsRoutes: RouteRecordRaw[] = [
  {
    path: '',
    component: () => loadAsyncImportWithRetry(() => import('./pages/RewardsTabsPage.vue')),
    children: [
      {
        path: '/points',
        name: PageNames.PointSystemWrapper,
        component: () => loadAsyncImportWithRetry(() => import('./pages/PointSystemV2Page.vue')),
      },
      {
        path: '/rewards',
        name: PageNames.Rewards,
        component: () => loadAsyncImportWithRetry(() => import('./pages/RewardsPage.vue')),
      },
      {
        path: '/referral/:referrerAddress?',
        name: PageNames.ReferralProgram,
        component: () => loadAsyncImportWithRetry(() => import('./pages/ReferralProgramPage.vue')),
        meta: {
          isInvitationRoute: true,
        },
      },
    ],
  },
];

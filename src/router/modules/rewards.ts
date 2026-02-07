import { PageNames } from '@/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const rewardsRoutes: RouteRecordRaw[] = [
  {
    path: '',
    component: lazyView(PageNames.RewardsTabs),
    children: [
      {
        path: '/points',
        name: PageNames.PointSystemWrapper,
        component: lazyView(PageNames.PointSystemWrapper),
      },
      {
        path: '/rewards',
        name: PageNames.Rewards,
        component: lazyView(PageNames.Rewards),
      },
      {
        path: '/referral/:referrerAddress?',
        name: PageNames.ReferralProgram,
        component: lazyView(PageNames.ReferralProgram),
        meta: {
          isInvitationRoute: true,
        },
      },
    ],
  },
];

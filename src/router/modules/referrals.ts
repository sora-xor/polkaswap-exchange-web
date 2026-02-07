import { PageNames } from '@/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const referralRoutes: RouteRecordRaw[] = [
  {
    path: '/referral/bond',
    name: PageNames.ReferralBonding,
    component: lazyView(PageNames.ReferralBonding),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: '/referral/unbond',
    name: PageNames.ReferralUnbonding,
    component: lazyView(PageNames.ReferralBonding),
    meta: {
      requiresAuth: true,
    },
  },
];

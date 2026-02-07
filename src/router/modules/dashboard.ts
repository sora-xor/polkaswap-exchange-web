import { DashboardPageNames } from '@/modules/dashboard/consts';
import { dashboardLazyView } from '@/modules/dashboard/router';
import { PageNames } from '@/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard/owner',
    component: lazyView(PageNames.AssetOwnerContainer),
    children: [
      {
        path: '',
        name: DashboardPageNames.AssetOwner,
        component: dashboardLazyView(DashboardPageNames.AssetOwner),
      },
      {
        path: ':asset',
        name: DashboardPageNames.AssetOwnerDetails,
        component: dashboardLazyView(DashboardPageNames.AssetOwnerDetails),
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/dashboard',
    redirect: '/wallet',
  },
];

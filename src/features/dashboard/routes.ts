import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

const DASHBOARD_ASSET_OWNER_ROUTE_NAME = 'AssetOwner';
const DASHBOARD_ASSET_OWNER_DETAILS_ROUTE_NAME = 'AssetOwnerDetails';

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard/owner',
    component: () => loadAsyncImportWithRetry(() => import('./pages/AssetOwnerContainerPage.vue')),
    children: [
      {
        path: '',
        name: DASHBOARD_ASSET_OWNER_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/AssetOwnerPage.vue')),
      },
      {
        path: ':asset',
        name: DASHBOARD_ASSET_OWNER_DETAILS_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/AssetOwnerDetailsPage.vue')),
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

import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

const VAULTS_ROUTE_NAME = 'Vaults';
const VAULT_DETAILS_ROUTE_NAME = 'VaultDetails';

export const vaultRoutes: RouteRecordRaw[] = [
  {
    path: '/kensetsu',
    component: () => loadAsyncImportWithRetry(() => import('./pages/VaultsContainerPage.vue')),
    children: [
      {
        path: '',
        name: VAULTS_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/VaultsPage.vue')),
      },
      {
        path: ':vault',
        name: VAULT_DETAILS_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/VaultDetailsPage.vue')),
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
];

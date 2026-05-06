import { loadAsyncImportWithRetry } from '@/shared/ui/async';
import { PageNames } from '@/consts';

import type { RouteRecordRaw } from 'vue-router';

const STAKING_ROUTE_NAME = 'Staking';
const SORA_OVERVIEW_ROUTE_NAME = 'Overview';
const SORA_VALIDATORS_TYPE_ROUTE_NAME = 'ValidatorsType';
const SORA_SELECT_VALIDATORS_ROUTE_NAME = 'SelectValidators';

export const stakingRoutes: RouteRecordRaw[] = [
  {
    path: '/staking',
    name: PageNames.StakingContainer,
    component: () => loadAsyncImportWithRetry(() => import('./pages/StakingContainerPage.vue')),
    redirect: { name: STAKING_ROUTE_NAME },
    children: [
      {
        path: 'list',
        name: STAKING_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/StakingPage.vue')),
        props: { isFarmingPage: false },
      },
    ],
  },
  {
    path: '',
    component: () => loadAsyncImportWithRetry(() => import('./pages/SoraDataContainerPage.vue')),
    children: [
      {
        path: '/staking/sora',
        name: SORA_OVERVIEW_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/SoraOverviewPage.vue')),
      },
      {
        path: '/staking/sora/validators/type',
        name: SORA_VALIDATORS_TYPE_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/SoraValidatorsTypePage.vue')),
      },
      {
        path: '/staking/sora/validators/select',
        name: SORA_SELECT_VALIDATORS_ROUTE_NAME,
        component: () => loadAsyncImportWithRetry(() => import('./pages/SoraSelectValidatorsPage.vue')),
      },
    ],
  },
];

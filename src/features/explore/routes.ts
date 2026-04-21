import { PageNames } from '@/consts';
import { loadAsyncImportWithRetry } from '@/shared/ui/async';

import type { RouteRecordRaw } from 'vue-router';

export const exploreRoutes: RouteRecordRaw[] = [
  {
    path: '/explore',
    name: PageNames.ExploreContainer,
    component: () => loadAsyncImportWithRetry(() => import('./pages/ExploreContainerPage.vue')),
    redirect: { name: PageNames.ExploreTokens },
    children: [
      {
        path: 'tokens',
        name: PageNames.ExploreTokens,
        component: () => loadAsyncImportWithRetry(() => import('./pages/ExploreTokensPage.vue')),
      },
      {
        path: 'demeter',
        component: () => loadAsyncImportWithRetry(() => import('./pages/DemeterDataContainerPage.vue')),
        children: [
          {
            path: 'staking',
            name: PageNames.ExploreStaking,
            component: () => loadAsyncImportWithRetry(() => import('./pages/ExploreDemeterPage.vue')),
            props: { isFarmingPage: false },
          },
          {
            path: 'farming',
            name: PageNames.ExploreFarming,
            component: () => loadAsyncImportWithRetry(() => import('./pages/ExploreDemeterPage.vue')),
            props: { isFarmingPage: true },
          },
        ],
      },
      {
        path: 'pools',
        component: () => loadAsyncImportWithRetry(() => import('./pages/PoolContainerPage.vue')),
        children: [
          {
            path: '',
            name: PageNames.ExplorePools,
            component: () => loadAsyncImportWithRetry(() => import('./pages/ExplorePoolsPage.vue')),
          },
        ],
      },
      {
        path: 'books',
        name: PageNames.ExploreBooks,
        component: () => loadAsyncImportWithRetry(() => import('./pages/ExploreBooksPage.vue')),
      },
    ],
  },
];

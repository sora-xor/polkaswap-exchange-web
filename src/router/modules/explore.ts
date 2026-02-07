import { PageNames } from '@/consts';
import { DemeterStakingPageNames } from '@/modules/staking/demeter/consts';
import { demeterStakingLazyView } from '@/modules/staking/router';
import { PoolPageNames } from '@/modules/pool/consts';
import { poolLazyView } from '@/modules/pool/router';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const exploreRoutes: RouteRecordRaw[] = [
  {
    path: '/explore',
    name: PageNames.ExploreContainer,
    component: lazyView(PageNames.ExploreContainer),
    redirect: { name: PageNames.ExploreTokens },
    children: [
      {
        path: 'tokens',
        name: PageNames.ExploreTokens,
        component: lazyView(PageNames.ExploreTokens),
      },
      {
        path: 'demeter',
        component: demeterStakingLazyView(DemeterStakingPageNames.DataContainer),
        children: [
          {
            path: 'staking',
            name: PageNames.ExploreStaking,
            component: lazyView(PageNames.ExploreDemeter),
            props: { isFarmingPage: false },
          },
          {
            path: 'farming',
            name: PageNames.ExploreFarming,
            component: lazyView(PageNames.ExploreDemeter),
            props: { isFarmingPage: true },
          },
        ],
      },
      {
        path: 'pools',
        component: poolLazyView(PoolPageNames.PoolContainer),
        children: [
          {
            path: '',
            name: PageNames.ExplorePools,
            component: lazyView(PageNames.ExplorePools),
          },
        ],
      },
      {
        path: 'books',
        name: PageNames.ExploreBooks,
        component: lazyView(PageNames.ExploreBooks),
      },
    ],
  },
];

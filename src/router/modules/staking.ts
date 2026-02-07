import { PageNames } from '@/consts';
import { PoolPageNames } from '@/modules/pool/consts';
import { poolLazyView } from '@/modules/pool/router';
import { DemeterStakingPageNames } from '@/modules/staking/demeter/consts';
import { demeterStakingLazyView, soraStakingLazyView, stakingLazyView } from '@/modules/staking/router';
import { SoraStakingPageNames } from '@/modules/staking/sora/consts';
import { StakingPageNames } from '@/modules/staking/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

export const stakingRoutes: RouteRecordRaw[] = [
  {
    path: '',
    component: demeterStakingLazyView(DemeterStakingPageNames.DataContainer),
    children: [
      {
        path: '/pool',
        component: poolLazyView(PoolPageNames.PoolContainer),
        children: [
          {
            path: '',
            name: DemeterStakingPageNames.Pool,
            component: demeterStakingLazyView(DemeterStakingPageNames.Pool),
            props: { isFarmingPage: true },
          },
          {
            path: 'add/:first?/:second?',
            name: PageNames.AddLiquidity,
            component: lazyView(PageNames.AddLiquidity),
            meta: { requiresAuth: true },
          },
        ],
      },
      {
        path: '/staking',
        name: PageNames.StakingContainer,
        component: lazyView(PageNames.StakingContainer),
        redirect: { name: StakingPageNames.Staking },
        children: [
          {
            path: 'list',
            name: StakingPageNames.Staking,
            component: stakingLazyView(StakingPageNames.Staking),
            props: { isFarmingPage: false },
          },
        ],
      },
    ],
  },
  {
    path: '',
    component: soraStakingLazyView(SoraStakingPageNames.DataContainer),
    children: [
      {
        path: '/staking/sora',
        name: SoraStakingPageNames.Overview,
        component: soraStakingLazyView(SoraStakingPageNames.Overview),
      },
      {
        path: '/staking/sora/validators/type',
        name: SoraStakingPageNames.ValidatorsType,
        component: soraStakingLazyView(SoraStakingPageNames.ValidatorsType),
      },
      {
        path: '/staking/sora/validators/select',
        name: SoraStakingPageNames.SelectValidators,
        component: soraStakingLazyView(SoraStakingPageNames.SelectValidators),
      },
    ],
  },
];

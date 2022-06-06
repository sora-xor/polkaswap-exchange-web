import VueRouter from 'vue-router';

import { PageNames } from '@/consts';
import { lazyView } from '@/router';

import { DemeterPageNames } from './consts';

export const demeterLazyComponent = (name: string) => () => import(`@/modules/demeterFarming/components/${name}.vue`);
export const demeterLazyView = (name: string) => () => import(`@/modules/demeterFarming/views/${name}.vue`);

const initPoolRoutes = (router: VueRouter): void => {
  router.addRoute({
    path: '/pool',
    name: PageNames.PoolContainer,
    component: lazyView(PageNames.PoolContainer),
    children: [
      {
        path: '',
        component: demeterLazyView(DemeterPageNames.DataContainer),
        children: [
          {
            path: '',
            name: DemeterPageNames.Pool,
            component: demeterLazyView(DemeterPageNames.Pool),
          },
          {
            path: 'create-pair',
            name: PageNames.CreatePair,
            component: lazyView(PageNames.CreatePair),
            meta: { requiresAuth: true },
          },
          {
            path: 'add/:firstAddress?/:secondAddress?',
            name: PageNames.AddLiquidity,
            component: lazyView(PageNames.AddLiquidity),
            meta: { requiresAuth: true },
          },
          {
            path: 'remove/:firstAddress/:secondAddress',
            name: PageNames.RemoveLiquidity,
            component: lazyView(PageNames.RemoveLiquidity),
            meta: { requiresAuth: true },
          },
        ],
      },
    ],
  });
};

const initStakingRoutes = (router: VueRouter): void => {
  const DemeterContainerName = 'DemeterStakingContainer';

  // #/staking
  router.addRoute({
    path: '/staking',
    name: PageNames.StakingContainer,
    component: lazyView(PageNames.StakingContainer),
    redirect: { name: DemeterPageNames.Staking },
  });

  router.addRoute(PageNames.StakingContainer, {
    path: 'demeter',
    name: DemeterContainerName,
    component: demeterLazyView(DemeterPageNames.DataContainer),
  });

  router.addRoute(DemeterContainerName, {
    path: '',
    name: DemeterPageNames.Staking,
    component: demeterLazyView(DemeterPageNames.Staking),
  });
};

export const initRoutes = (router: VueRouter): void => {
  initPoolRoutes(router);
  initStakingRoutes(router);
};

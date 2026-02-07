import { PageNames } from '@/consts';
import { lazyView } from '@/router/lazy';

import type { RouteRecordRaw } from 'vue-router';

/**
 * Primary swap landing routes (including `/` redirect).
 */
export const swapRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/swap',
  },
  {
    path: '/swap/:first?/:second?',
    name: PageNames.Swap,
    component: lazyView(PageNames.Swap),
  },
];

import type { PageNames } from '@/consts';

import { DashboardComponents, DashboardPageNames } from './consts';

export const dashboardLazyView = (name: DashboardPageNames) => () => import(`@/modules/dashboard/views/${name}.vue`);

export const dashboardLazyComponent = (name: DashboardComponents) => () =>
  import(`@/modules/dashboard/components/${name}.vue`);

export function isDashboardPage(name: Nullable<string | DashboardPageNames | PageNames>): boolean {
  return Object.values(DashboardPageNames).includes(name as DashboardPageNames);
}

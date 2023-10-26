import type { PageNames } from '@/consts';

import { DashboardPageNames } from './consts';

// export const dashboardLazyComponent = (name: string) => () => import(`@/modules/dashboard/components/${name}.vue`);
// export const dashboardLazyView = (name: string) => () => import(`@/modules/dashboard/views/${name}.vue`);

export function isDashboardPage(name: Nullable<string | DashboardPageNames | PageNames>): boolean {
  return Object.values(DashboardPageNames).includes(name as DashboardPageNames);
}

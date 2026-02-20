import type { PageNames } from '@/consts';
import { createAsyncComponent } from '@/router/lazy';

import { PoolComponents, PoolPageNames } from './consts';

export const poolLazyView = (name: PoolPageNames) => () => import(`@/modules/pool/views/${name}.vue`);

export const poolLazyViewComponent = (name: PoolPageNames) =>
  createAsyncComponent(() => import(`@/modules/pool/views/${name}.vue`));

export const poolLazyComponent = (name: PoolComponents) =>
  createAsyncComponent(() => import(`@/modules/pool/components/${name}.vue`));

export function isPoolPage(name: Nullable<string | PoolPageNames | PageNames>): boolean {
  return Object.values(PoolPageNames).includes(name as PoolPageNames);
}

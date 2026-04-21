import type { PageNames } from '@/consts';
import { createAsyncComponent } from '@/router/lazy';

import { VaultComponents, VaultPageNames } from './consts';

export const vaultLazyComponent = (name: VaultComponents) =>
  createAsyncComponent(() => import(`@/modules/vault/components/${name}.vue`));

export function isVaultPage(name: Nullable<string | VaultPageNames | PageNames>): boolean {
  return Object.values(VaultPageNames).includes(name as VaultPageNames);
}

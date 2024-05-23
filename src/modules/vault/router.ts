import type { PageNames } from '@/consts';

import { VaultComponents, VaultPageNames } from './consts';

export const vaultLazyView = (name: VaultPageNames) => () => import(`@/modules/vault/views/${name}.vue`);

export const vaultLazyComponent = (name: VaultComponents) => () => import(`@/modules/vault/components/${name}.vue`);

export function isVaultPage(name: Nullable<string | VaultPageNames | PageNames>): boolean {
  return Object.values(VaultPageNames).includes(name as VaultPageNames);
}

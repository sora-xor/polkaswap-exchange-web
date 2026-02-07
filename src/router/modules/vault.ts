import { VaultPageNames } from '@/modules/vault/consts';
import { vaultLazyView } from '@/modules/vault/router';

import type { RouteRecordRaw } from 'vue-router';

export const vaultRoutes: RouteRecordRaw[] = [
  {
    path: '/kensetsu',
    component: vaultLazyView(VaultPageNames.VaultsContainer),
    children: [
      {
        path: '',
        name: VaultPageNames.Vaults,
        component: vaultLazyView(VaultPageNames.Vaults),
      },
      {
        path: ':vault',
        name: VaultPageNames.VaultDetails,
        component: vaultLazyView(VaultPageNames.VaultDetails),
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
];

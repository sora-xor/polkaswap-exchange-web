import { describe, expect, it } from 'vitest';

import * as walletCore from '@/lib/soraneo-wallet/src/core';
import wallet, { WalletModules } from '@/lib/soraneo-wallet/src/store/wallet';
import { vuex } from '@/lib/soraneo-wallet/src/vuex';

describe('wallet vuex registry', () => {
  it('keeps exposing the wallet module registry without decorator helpers', () => {
    expect(vuex.walletModules.wallet).toBe(wallet);
    expect(vuex.WalletModules).toEqual(WalletModules);
  });

  it('keeps re-exporting the module registry from the wallet public core surface', () => {
    expect(walletCore.vuex).toBe(vuex);
  });
});

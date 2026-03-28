import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
  useLoading: () => ({
    loading: ref(false),
    withLoading: vi.fn((handler: () => Promise<unknown>) => handler()),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => key,
    withAppNotification: vi.fn((handler: () => Promise<unknown>) => handler()),
  }),
}));

import AccountListStep from '@/lib/soraneo-wallet/src/components/Connection/Step/AccountList.vue';
import { AccountActionTypes, AppWallet } from '@/lib/soraneo-wallet/src/consts';
import { settingsStorage } from '@/lib/soraneo-wallet/src/util/storage';

import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';

describe('Wallet AccountListStep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the delete dialog when the confirmation popup is enabled', () => {
    vi.spyOn(settingsStorage, 'get').mockReturnValue(null);

    const account = {
      address: 'address-1',
      source: AppWallet.Sora,
    } as PolkadotJsAccount;
    const state = (AccountListStep as any).setup(
      {
        chainApi: {},
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    state.handleAccountAction(AccountActionTypes.Delete, account);

    expect(state.selectedAccount.value).toEqual(account);
    expect(state.accountDeleteVisibility.value).toBe(true);
  });

  it('skips the delete dialog when the popup preference is disabled', async () => {
    vi.spyOn(settingsStorage, 'get').mockReturnValue('false');
    const deleteAccount = vi.fn(async () => undefined);
    const state = (AccountListStep as any).setup(
      {
        chainApi: {},
        deleteAccount,
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    state.handleAccountAction(AccountActionTypes.Delete, {
      address: 'address-2',
      source: AppWallet.Sora,
    });
    await Promise.resolve();

    expect(state.accountDeleteVisibility.value).toBe(false);
    expect(deleteAccount).toHaveBeenCalledWith('address-2');
  });
});

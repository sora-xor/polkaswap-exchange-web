import { afterEach, describe, expect, it, vi } from 'vitest';

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

    const context = {
      selectedAccount: null,
      accountDeleteVisibility: false,
      handleDeleteAccount: vi.fn(),
    };

    (AccountListStep as any).methods.handleAccountAction.call(context, AccountActionTypes.Delete, account);

    expect(context.selectedAccount).toEqual(account);
    expect(context.accountDeleteVisibility).toBe(true);
    expect(context.handleDeleteAccount).not.toHaveBeenCalled();
  });

  it('skips the delete dialog when the popup preference is disabled', () => {
    vi.spyOn(settingsStorage, 'get').mockReturnValue('false');

    const context = {
      selectedAccount: null,
      accountDeleteVisibility: false,
      handleDeleteAccount: vi.fn(),
    };

    (AccountListStep as any).methods.handleAccountAction.call(context, AccountActionTypes.Delete, {
      address: 'address-2',
      source: AppWallet.Sora,
    });

    expect(context.accountDeleteVisibility).toBe(false);
    expect(context.handleDeleteAccount).toHaveBeenCalledTimes(1);
  });
});

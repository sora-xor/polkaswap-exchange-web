import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistedValues = vi.hoisted(() => ({
  account: new Map<string, string>(),
  runtime: new Map<string, string>(),
  settings: new Map<string, string>(),
}));

vi.mock('@/lib/soraneo-wallet/src/util/storage', () => {
  const createStorage = (values: Map<string, string>) => ({
    get: (key: string) => values.get(key) ?? '',
    set: (key: string, value: unknown) => values.set(key, String(value)),
    remove: (key: string) => values.delete(key),
  });

  return {
    storage: createStorage(persistedValues.account),
    runtimeStorage: createStorage(persistedValues.runtime),
    settingsStorage: createStorage(persistedValues.settings),
  };
});

import { DefaultPassphraseTimeout } from '@/lib/soraneo-wallet/src/consts';
import { initialState as createAccountState } from '@/stores/wallet/account/state';
import { initialState as createSettingsState } from '@/stores/wallet/settings/state';
import { initialState as createTransactionsState } from '@/stores/wallet/transactions/state';

describe('wallet persisted state', () => {
  beforeEach(() => {
    persistedValues.account.clear();
    persistedValues.runtime.clear();
    persistedValues.settings.clear();
  });

  it('uses safe account defaults when persisted JSON is malformed', () => {
    persistedValues.settings.set('book', '{');
    persistedValues.settings.set('pinnedAssets', '{');
    persistedValues.settings.set('accountPasswordTimeout', '{');
    persistedValues.account.set('isExternal', '{');

    const state = createAccountState();

    expect(state.book).toEqual({});
    expect(state.pinnedAssets).toEqual([]);
    expect(state.isExternal).toBe(false);
    expect(state.accountPasswordTimeout).toBe(DefaultPassphraseTimeout);
  });

  it('rejects schema-incompatible account values even when they are valid JSON', () => {
    persistedValues.settings.set('book', '[]');
    persistedValues.settings.set('pinnedAssets', '{}');
    persistedValues.settings.set('accountPasswordTimeout', '-1');
    persistedValues.account.set('isExternal', '"true"');

    const state = createAccountState();

    expect(state.book).toEqual({});
    expect(state.pinnedAssets).toEqual([]);
    expect(state.isExternal).toBe(false);
    expect(state.accountPasswordTimeout).toBe(DefaultPassphraseTimeout);
  });

  it('uses safe wallet-setting defaults when persisted values are corrupt', () => {
    persistedValues.settings.set('alerts', '{');
    persistedValues.settings.set('allowTopUpAlerts', '{');
    persistedValues.settings.set('allowFeePopup', '{');
    persistedValues.account.set('filters', 'null');
    persistedValues.account.set('shouldBalanceBeHidden', '{');
    persistedValues.runtime.set('feeMultiplier', 'Infinity');
    persistedValues.runtime.set('version', '1.5');

    const state = createSettingsState();

    expect(state.alerts).toEqual([]);
    expect(state.allowTopUpAlert).toBe(false);
    expect(state.allowFeePopup).toBe(true);
    expect(state.filters).toEqual({ option: 'All', verifiedOnly: false, zeroBalance: false });
    expect(state.shouldBalanceBeHidden).toBe(false);
    expect(state.feeMultiplier).toBe(0);
    expect(state.runtimeVersion).toBe(0);
  });

  it('uses enabled transaction dialogs when persisted flags are corrupt', () => {
    persistedValues.settings.set('confirmTxDialogDisabled', '{');
    persistedValues.settings.set('signTxDialogDisabled', '"true"');

    const state = createTransactionsState();

    expect(state.isConfirmTxDialogDisabled).toBe(false);
    expect(state.isSignTxDialogDisabled).toBe(false);
  });
});

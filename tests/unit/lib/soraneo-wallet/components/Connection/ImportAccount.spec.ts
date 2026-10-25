import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => key,
    withAppNotification: vi.fn((handler: () => Promise<unknown>) => handler()),
    TranslationConsts: { JSON: 'JSON' },
  }),
}));

import ImportAccountStep from '@/lib/soraneo-wallet/src/components/Connection/Step/ImportAccount.vue';
import { LoginStep } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet ImportAccountStep', () => {
  it('sanitizes mnemonic input and ignores invalid characters', () => {
    const state = (ImportAccountStep as any).setup(
      { step: LoginStep.Import },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    state.mnemonicPhrase.value = 'alpha beta';
    state.handleMnemonicInput('alpha.  gamma');
    expect(state.mnemonicPhrase.value).toBe('alpha gamma');

    state.handleMnemonicInput('Alpha');
    expect(state.mnemonicPhrase.value).toBe('alpha gamma');
  });

  it('uses restoreAccount for json imports and resets the form afterward', async () => {
    const restoreAccount = vi.fn();
    const createAccount = vi.fn();
    const json = { address: 'wallet-address' };
    const state = (ImportAccountStep as any).setup(
      {
        step: LoginStep.ImportCredentials,
        restoreAccount,
        createAccount,
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    state.json.value = json;
    state.accountPassword.value = 'x';
    expect(state.disabledImportStep.value).toBe(false);
    await state.importAccount();

    expect(restoreAccount).toHaveBeenCalledWith({ json, password: 'x' });
    expect(createAccount).not.toHaveBeenCalled();
    expect(state.accountPassword.value).toBe('');
  });

  it('preserves a legacy short password when importing a recovery phrase', async () => {
    const restoreAccount = vi.fn();
    const createAccount = vi.fn().mockResolvedValue(undefined);
    const state = (ImportAccountStep as any).setup(
      { step: LoginStep.ImportCredentials, restoreAccount, createAccount },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );
    state.mnemonicPhrase.value = 'synthetic recovery phrase';
    state.accountName.value = 'Existing wallet';
    state.accountPassword.value = 'x';
    state.accountPasswordConfirm.value = 'x';

    expect(state.disabledImportStep.value).toBe(false);
    await state.importAccount();

    expect(createAccount).toHaveBeenCalledExactlyOnceWith({
      seed: 'synthetic recovery phrase',
      name: 'Existing wallet',
      password: 'x',
      passwordConfirm: 'x',
    });
    expect(restoreAccount).not.toHaveBeenCalled();
  });
});

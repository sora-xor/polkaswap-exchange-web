import { describe, expect, it, vi } from 'vitest';

import ImportAccountStep from '@/lib/soraneo-wallet/src/components/Connection/Step/ImportAccount.vue';

describe('Wallet ImportAccountStep', () => {
  it('sanitizes mnemonic input and ignores invalid characters', () => {
    const context = {
      mnemonicPhrase: 'alpha beta',
    };

    (ImportAccountStep as any).methods.handleMnemonicInput.call(context, 'alpha.  gamma');
    expect(context.mnemonicPhrase).toBe('alpha gamma');

    (ImportAccountStep as any).methods.handleMnemonicInput.call(context, 'Alpha');
    expect(context.mnemonicPhrase).toBe('alpha gamma');
  });

  it('uses restoreAccount for json imports and resets the form afterward', async () => {
    const restoreAccount = vi.fn();
    const createAccount = vi.fn();
    const resetForm = vi.fn();
    const json = { address: 'wallet-address' };

    await (ImportAccountStep as any).methods.importAccount.call({
      json,
      accountPassword: 'secret',
      restoreAccount,
      createAccount,
      resetForm,
    });

    expect(restoreAccount).toHaveBeenCalledWith({ json, password: 'secret' });
    expect(createAccount).not.toHaveBeenCalled();
    expect(resetForm).toHaveBeenCalledTimes(1);
  });
});

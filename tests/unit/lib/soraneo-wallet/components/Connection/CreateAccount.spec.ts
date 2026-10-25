import { nextTick, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => key,
  }),
}));

import CreateAccountStep from '@/lib/soraneo-wallet/src/components/Connection/Step/CreateAccount.vue';
import { LoginStep } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet CreateAccountStep', () => {
  it.each(['', 'x', '1234567', '😀😀😀😀'])(
    'blocks creation with a short password, including direct form submission (%j)',
    async (password) => {
      const createSeed = vi.fn(() => ({ seed: 'synthetic mnemonic' }));
      const createAccount = vi.fn();
      const props = reactive({ chainApi: { createSeed }, step: LoginStep.CreateCredentials, createAccount });
      const state = (CreateAccountStep as any).setup(props, {
        attrs: {},
        emit: vi.fn(),
        expose: vi.fn(),
        slots: {},
      });
      state.accountName.value = 'Wallet';
      state.accountPassword.value = password;
      state.accountPasswordConfirm.value = password;

      expect(state.btnConfirmDisabled.value).toBe(true);
      await expect(state.handleAccountCreate()).resolves.toBeUndefined();
      expect(createAccount).not.toHaveBeenCalled();
      expect(createSeed).not.toHaveBeenCalled();
    }
  );

  it.each(['12345678', '😀😀😀😀😀😀😀😀'])(
    'accepts exactly eight characters without changing the password (%j)',
    async (password) => {
      const createAccount = vi.fn().mockResolvedValue(undefined);
      const props = reactive({
        chainApi: { createSeed: () => ({ seed: 'synthetic mnemonic' }) },
        step: LoginStep.CreateCredentials,
        createAccount,
      });
      const state = (CreateAccountStep as any).setup(props, {
        attrs: {},
        emit: vi.fn(),
        expose: vi.fn(),
        slots: {},
      });
      state.accountName.value = 'Wallet';
      state.accountPassword.value = password;
      state.accountPasswordConfirm.value = password;

      expect(state.btnConfirmDisabled.value).toBe(false);
      await state.handleAccountCreate();
      expect(createAccount).toHaveBeenCalledExactlyOnceWith({
        seed: 'synthetic mnemonic',
        name: 'Wallet',
        password,
        passwordConfirm: password,
        exportAccount: false,
      });
    }
  );

  it('blocks mismatched passwords and duplicate submits while loading', async () => {
    const createSeed = vi.fn(() => ({ seed: 'synthetic mnemonic' }));
    const createAccount = vi.fn();
    const props = reactive({
      chainApi: { createSeed },
      step: LoginStep.CreateCredentials,
      createAccount,
      loading: false,
    });
    const state = (CreateAccountStep as any).setup(props, {
      attrs: {},
      emit: vi.fn(),
      expose: vi.fn(),
      slots: {},
    });
    state.accountName.value = 'Wallet';
    state.accountPassword.value = '12345678';
    state.accountPasswordConfirm.value = 'different';
    expect(state.btnConfirmDisabled.value).toBe(true);
    await state.handleAccountCreate();

    state.accountPasswordConfirm.value = '12345678';
    props.loading = true;
    expect(state.btnConfirmDisabled.value).toBe(true);
    await state.handleAccountCreate();

    expect(createAccount).not.toHaveBeenCalled();
    expect(createSeed).not.toHaveBeenCalled();
  });

  it('clears the selected words and starts error feedback when mnemonic order is wrong', () => {
    const props = reactive({
      chainApi: {
        createSeed: () => ({ seed: 'one two three four five six seven eight nine ten eleven twelve' }),
      },
      step: LoginStep.ConfirmSeedPhrase,
    });
    const state = (CreateAccountStep as any).setup(props, {
      attrs: {},
      emit: vi.fn(),
      expose: vi.fn(),
      slots: {},
    });

    state.seedPhraseToCompareIdx.value = Object.keys(state.randomizedSeedPhraseMap.value).map(Number);
    state.handleMnemonicCheck();

    expect(state.seedPhraseToCompareIdx.value).toEqual([]);
    expect(state.showErrorMessage.value).toBe(true);
    expect(state.incorrect.value).toBe(true);
  });

  it('resets the compare buffer when leaving the confirmation step', async () => {
    const props = reactive({
      chainApi: {
        createSeed: () => ({ seed: 'one two three four five six seven eight nine ten eleven twelve' }),
      },
      step: LoginStep.ConfirmSeedPhrase,
    });
    const state = (CreateAccountStep as any).setup(props, {
      attrs: {},
      emit: vi.fn(),
      expose: vi.fn(),
      slots: {},
    });

    state.seedPhraseToCompareIdx.value = [2, 4, 6];
    props.step = LoginStep.Import;
    await nextTick();

    expect(state.seedPhraseToCompareIdx.value).toEqual([]);
  });

  it('retains the same seed and credentials when backup creation fails so the user can retry', async () => {
    const seed = 'one two three four five six seven eight nine ten eleven twelve';
    const createSeed = vi.fn(() => ({ seed }));
    const createAccount = vi.fn().mockRejectedValueOnce(new Error('upload failed')).mockResolvedValueOnce(undefined);
    const props = reactive({ chainApi: { createSeed }, step: LoginStep.CreateCredentials, createAccount });
    const emit = vi.fn();
    const state = (CreateAccountStep as any).setup(props, { attrs: {}, emit, expose: vi.fn(), slots: {} });
    state.accountName.value = 'Wallet';
    state.accountPassword.value = 'synthetic password';
    state.accountPasswordConfirm.value = 'synthetic password';
    await expect(state.handleAccountCreate()).rejects.toThrow('upload failed');
    expect(state.accountName.value).toBe('Wallet');
    expect(state.accountPassword.value).toBe('synthetic password');
    expect(state.accountPasswordConfirm.value).toBe('synthetic password');
    expect(state.seedPhrase.value).toBe(seed);
    expect(emit).not.toHaveBeenCalled();

    await state.handleAccountCreate();
    expect(createAccount.mock.calls[0]).toEqual(createAccount.mock.calls[1]);
    expect(createSeed).toHaveBeenCalledOnce();
  });
});

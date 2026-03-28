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
});

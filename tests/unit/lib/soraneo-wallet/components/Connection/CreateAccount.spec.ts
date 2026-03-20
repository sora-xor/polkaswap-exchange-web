import { describe, expect, it, vi } from 'vitest';

import CreateAccountStep from '@/lib/soraneo-wallet/src/components/Connection/Step/CreateAccount.vue';
import { LoginStep } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet CreateAccountStep', () => {
  it('clears the selected words and starts error feedback when mnemonic order is wrong', () => {
    const runErrorMessage = vi.fn();
    const runReturnAnimation = vi.fn();

    const context = {
      PhraseLength: 3,
      seedPhraseToCompare: ['one', 'two', 'three'],
      seedPhrase: 'one three two',
      seedPhraseToCompareIdx: [0, 1, 2],
      runErrorMessage,
      runReturnAnimation,
      $emit: vi.fn(),
    };

    (CreateAccountStep as any).methods.handleMnemonicCheck.call(context);

    expect(context.seedPhraseToCompareIdx).toEqual([]);
    expect(runErrorMessage).toHaveBeenCalledTimes(1);
    expect(runReturnAnimation).toHaveBeenCalledTimes(1);
  });

  it('resets the compare buffer when leaving the confirmation step', () => {
    const context = {
      seedPhraseToCompareIdx: [2, 4, 6],
    };

    (CreateAccountStep as any).watch.step.call(context, LoginStep.Import);

    expect(context.seedPhraseToCompareIdx).toEqual([]);
  });
});

import { describe, expect, it, vi } from 'vitest';

import ConnectionView, {
  getPreviousLoginStep,
} from '@/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue';
import { LoginStep } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet ConnectionView', () => {
  it('computes the previous step for create, import, and select flows', () => {
    expect(getPreviousLoginStep()).toBe(LoginStep.ExtensionList);
    expect(getPreviousLoginStep(LoginStep.AccountList)).toBe(LoginStep.ExtensionList);
    expect(getPreviousLoginStep(LoginStep.ConfirmSeedPhrase)).toBe(LoginStep.SeedPhrase);
    expect(getPreviousLoginStep(LoginStep.CreateCredentials)).toBe(LoginStep.ConfirmSeedPhrase);
    expect(getPreviousLoginStep(LoginStep.ImportCredentials)).toBe(LoginStep.Import);
  });

  it('resets the selected wallet when navigating back to extension list', () => {
    const closeView = vi.fn();
    const resetSelectedWallet = vi.fn();
    const context = {
      step: LoginStep.AccountList,
      prevStep: LoginStep.ExtensionList,
      closeView,
      isExtensionsList: true,
      resetSelectedWallet,
    };

    (ConnectionView as any).methods.handleBack.call(context);

    expect(context.step).toBe(LoginStep.ExtensionList);
    expect(resetSelectedWallet).toHaveBeenCalledTimes(1);
    expect(closeView).not.toHaveBeenCalled();
  });

  it('closes the view when already at the root step', () => {
    const closeView = vi.fn();

    (ConnectionView as any).methods.handleBack.call({
      step: LoginStep.ExtensionList,
      prevStep: LoginStep.ExtensionList,
      closeView,
      isExtensionsList: true,
      resetSelectedWallet: vi.fn(),
    });

    expect(closeView).toHaveBeenCalledTimes(1);
  });
});

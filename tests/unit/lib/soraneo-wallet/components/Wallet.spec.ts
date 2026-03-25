import { describe, expect, it, vi } from 'vitest';

import Wallet from '@/lib/soraneo-wallet/src/components/Wallet.vue';
import walletSource from '@/lib/soraneo-wallet/src/components/Wallet.vue?raw';

describe('Wallet Wallet', () => {
  it('opens the multisig onboarding when no MST account is available', () => {
    const context = {
      isMSTAccount: false,
      hasMSTAccount: false,
      isMSTAvailable: false,
      dialogMSTNameChange: false,
      mstOnboardingDialog: false,
    };

    (Wallet as any).methods.handleMST.call(context);

    expect(context.dialogMSTNameChange).toBe(false);
    expect(context.mstOnboardingDialog).toBe(true);
  });

  it('resets selected transaction details when navigating back from the details view', () => {
    const resetTxDetailsId = vi.fn();

    (Wallet as any).methods.handleBack.call({
      selectedTransaction: { id: 'tx-1' },
      resetTxDetailsId,
    });

    expect(resetTxDetailsId).toHaveBeenCalledTimes(1);
  });

  it('does not add local-only icon dimming overrides to the wallet account panel', () => {
    expect(walletSource).not.toContain('.wallet-account-panel');
    expect(walletSource).not.toContain('opacity: 0.7');
  });
});

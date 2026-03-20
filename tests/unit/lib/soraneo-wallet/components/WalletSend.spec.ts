import { FPNumber, Operation } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

import WalletSend from '@/lib/soraneo-wallet/src/components/WalletSend.vue';

describe('Wallet WalletSend', () => {
  it('routes through the fee warning step when the next transaction would fail the XOR fee check', async () => {
    const handleConfirm = vi.fn();
    const fetchNetworkFee = vi.fn();
    const context = {
      allowFeePopup: true,
      isXorSufficientForNextTx: vi.fn(() => false),
      isXorAccountAsset: true,
      getFPNumber: vi.fn(() => new FPNumber(1)),
      amount: '1',
      showAdditionalInfo: true,
      step: 1,
      isConfirmTxDisabled: false,
      handleConfirm,
      fetchNetworkFee,
    };

    await (WalletSend as any).methods.handleSend.call(context);

    expect(context.isXorSufficientForNextTx).toHaveBeenCalledWith({
      type: Operation.Transfer,
      isXor: true,
      amount: expect.any(FPNumber),
    });
    expect(context.showAdditionalInfo).toBe(false);
    expect(context.step).toBe(2);
    expect(handleConfirm).not.toHaveBeenCalled();
    expect(fetchNetworkFee).not.toHaveBeenCalled();
  });
});

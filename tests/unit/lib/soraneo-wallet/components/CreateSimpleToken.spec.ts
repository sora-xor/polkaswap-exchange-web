import { describe, expect, it, vi } from 'vitest';

import CreateSimpleToken from '@/lib/soraneo-wallet/src/components/CreateSimpleToken.vue';
import { Step } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet CreateSimpleToken', () => {
  it('routes through the fee warning step when the next transaction would fail the fee check', async () => {
    const emit = vi.fn();
    const onConfirm = vi.fn();
    const getCorrectSupply = vi.fn(() => '100');
    const isXorSufficientForNextTx = vi.fn(() => false);

    const context = {
      tokenSymbol: 'TKN',
      tokenSupply: '100',
      tokenName: 'Token',
      decimals: 18,
      getCorrectSupply,
      $emit: emit,
      allowFeePopup: true,
      hasEnoughXor: true,
      isXorSufficientForNextTx,
      isConfirmTxDisabled: false,
      showFee: true,
      onConfirm,
    };

    await (CreateSimpleToken as any).methods.onCreate.call(context);

    expect(getCorrectSupply).toHaveBeenCalledWith('100', 18);
    expect(context.tokenSupply).toBe('100');
    expect(context.showFee).toBe(false);
    expect(emit).toHaveBeenNthCalledWith(1, 'showTabs');
    expect(emit).toHaveBeenNthCalledWith(2, 'showHeader');
    expect(emit).toHaveBeenNthCalledWith(3, 'stepChange', Step.Warn);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('restores the confirm step after the fee warning acknowledgment', () => {
    const emit = vi.fn();
    const context = {
      showFee: false,
      $emit: emit,
    };

    (CreateSimpleToken as any).methods.confirmNextTxFailure.call(context);

    expect(context.showFee).toBe(true);
    expect(emit).toHaveBeenNthCalledWith(1, 'showHeader');
    expect(emit).toHaveBeenNthCalledWith(2, 'stepChange', Step.ConfirmSimpleToken);
  });
});

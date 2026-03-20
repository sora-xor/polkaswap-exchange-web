import { describe, expect, it, vi } from 'vitest';

import CreateNftToken from '@/lib/soraneo-wallet/src/components/CreateNftToken.vue';
import { Step } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet CreateNftToken', () => {
  it('routes through the fee warning step when the register-asset fee would block the next transaction', async () => {
    const emit = vi.fn();
    const context = {
      tokenSymbol: 'NFT',
      tokenSupply: '1',
      tokenDescription: 'Test NFT',
      tokenName: 'Sample',
      badSource: false,
      decimals: 18,
      getCorrectSupply: vi.fn(() => '1'),
      $emit: emit,
      allowFeePopup: true,
      hasEnoughXor: true,
      isXorSufficientForNextTx: vi.fn(() => false),
      isConfirmTxDisabled: false,
      showFee: true,
      onConfirm: vi.fn(),
    };

    await (CreateNftToken as any).methods.onCreate.call(context);

    expect(context.getCorrectSupply).toHaveBeenCalledWith('1', 18);
    expect(context.showFee).toBe(false);
    expect(emit).toHaveBeenNthCalledWith(1, 'showTabs');
    expect(emit).toHaveBeenNthCalledWith(2, 'showHeader');
    expect(emit).toHaveBeenNthCalledWith(3, 'stepChange', Step.Warn);
  });
});

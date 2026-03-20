import { Operation } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

import WalletAdarTxDetails from '@/lib/soraneo-wallet/src/components/WalletAdarTxDetails.vue';

describe('Wallet WalletAdarTxDetails', () => {
  it('exposes recipients only for outgoing swap-transfer batch transactions', () => {
    const receivers = [
      { accountId: 'alice', amount: '1', symbol: 'XOR' },
      { accountId: 'bob', amount: '2', symbol: 'XOR' },
    ];

    const swapTransferBatchRecipients = (WalletAdarTxDetails as any).computed.swapTransferBatchRecipients.call({
      isAdarOperation: true,
      account: { address: 'sender' },
      transaction: {
        type: Operation.SwapTransferBatch,
        from: 'sender',
        payload: { receivers },
      },
    });

    expect(swapTransferBatchRecipients).toEqual(receivers);
    expect((WalletAdarTxDetails as any).computed.numberOfRecipients.call({ swapTransferBatchRecipients })).toBe(2);
  });

  it('delegates the visible page calculation to the pagination mixin', () => {
    const getPageItems = vi.fn((items: unknown[]) => items.slice(0, 1));
    const recipients = [{ accountId: 'alice' }, { accountId: 'bob' }];

    const txsList = (WalletAdarTxDetails as any).computed.txsList.call({
      getPageItems,
      swapTransferBatchRecipients: recipients,
    });

    expect(getPageItems).toHaveBeenCalledWith(recipients);
    expect(txsList).toEqual([{ accountId: 'alice' }]);
  });
});

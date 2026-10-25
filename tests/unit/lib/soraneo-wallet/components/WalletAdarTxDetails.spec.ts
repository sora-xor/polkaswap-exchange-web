import { Operation } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const getPageItems = vi.hoisted(() => vi.fn((items: unknown[]) => items.slice(0, 1)));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    account: { address: 'sender' },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatStringValue: vi.fn((value: string) => value),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/usePaginationSearch', () => ({
  usePaginationSearch: () => ({
    currentPage: ref(1),
    pageAmount: ref(4),
    getPageItems,
    handlePrevClick: vi.fn(),
    handleNextClick: vi.fn(),
  }),
}));

import WalletAdarTxDetails from '@/lib/soraneo-wallet/src/components/WalletAdarTxDetails.vue';

describe('Wallet WalletAdarTxDetails', () => {
  it('exposes recipients only for outgoing swap-transfer batch transactions', () => {
    const receivers = [
      { accountId: 'alice', amount: '1', symbol: 'XOR' },
      { accountId: 'bob', amount: '2', symbol: 'XOR' },
    ];

    const state = (WalletAdarTxDetails as any).setup(
      {
        transaction: {
          type: Operation.SwapTransferBatch,
          from: 'sender',
          payload: { receivers },
        },
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    expect(state.swapTransferBatchRecipients.value).toEqual(receivers);
    expect(state.numberOfRecipients.value).toBe(2);
  });

  it('delegates the visible page calculation to the pagination mixin', () => {
    const recipients = [{ accountId: 'alice' }, { accountId: 'bob' }];
    const state = (WalletAdarTxDetails as any).setup(
      {
        transaction: {
          type: Operation.SwapTransferBatch,
          from: 'sender',
          payload: { receivers: recipients },
        },
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    expect(state.txsList.value).toEqual([{ accountId: 'alice' }]);
    expect(getPageItems).toHaveBeenCalledWith(recipients);
  });
});

import { describe, expect, it, vi } from 'vitest';

import WalletHistory from '@/lib/soraneo-wallet/src/components/WalletHistory.vue';
import { PaginationButton } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet WalletHistory', () => {
  it('switches to reverse pagination when jumping to the last page', async () => {
    const updateHistory = vi.fn(async () => undefined);
    const context = {
      currentPage: 1,
      lastPage: 4,
      isLtrDirection: true,
      updateHistory,
    };

    await (WalletHistory as any).methods.handlePaginationClick.call(context, PaginationButton.Last);

    expect(updateHistory).toHaveBeenCalledWith(4);
    expect(context.currentPage).toBe(4);
    expect(context.isLtrDirection).toBe(false);
  });
});

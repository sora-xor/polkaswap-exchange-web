import { describe, expect, it } from 'vitest';

import WalletTransactionDetails from '@/lib/soraneo-wallet/src/components/WalletTransactionDetails.vue';

describe('Wallet WalletTransactionDetails', () => {
  it('falls back to the general localized error when a specific translation is missing', () => {
    const errorMessage = (WalletTransactionDetails as any).computed.errorMessage.call({
      selectedTransaction: {
        errorMessage: {
          section: 'Balances',
          name: 'UnknownError',
        },
      },
      t: (key: string) => (key === 'historyErrorMessages.generalError' ? 'General error' : key),
    });

    expect(errorMessage).toBe('General error');
  });
});

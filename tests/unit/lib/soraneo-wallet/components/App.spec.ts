import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/SoraWallet.vue', () => ({
  default: { name: 'SoraWalletStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/ConfirmDialog.vue', () => ({
  default: { name: 'ConfirmDialogStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletProviders.vue', () => ({
  default: { name: 'WalletProvidersStub' },
}));

import App from '@/lib/soraneo-wallet/src/App.vue';
import { IndexerType } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet App', () => {
  it('toggles the selected indexer between subsquid and subquery', () => {
    const selectIndexer = vi.fn();

    (App as any).methods.changeIndexer.call({
      indexerType: IndexerType.SUBSQUID,
      selectIndexer,
    });

    expect(selectIndexer).toHaveBeenCalledWith(IndexerType.SUBQUERY);
  });

  it('delegates fiat currency changes through the computed setter', () => {
    const setFiatCurrency = vi.fn();

    (App as any).computed.appCurrency.set.call(
      {
        setFiatCurrency,
      },
      'USD'
    );

    expect(setFiatCurrency).toHaveBeenCalledWith('USD');
  });
});

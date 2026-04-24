import { describe, expect, it, vi } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

const selectIndexer = vi.hoisted(() => vi.fn());
const setFiatCurrency = vi.hoisted(() => vi.fn());

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    assetsToNotifyQueue: [],
    ceresFiatValuesUsage: false,
    indexerType: 'subsquid',
    currency: 'XOR',
    currencies: [{ key: 'USD' }],
    isSignTxDialogVisible: false,
    libraryTheme: 'light',
    shouldBalanceBeHidden: false,
    firstReadyTransaction: null,
    account: null,
    setSoraNetwork: vi.fn(),
    setIndexerEndpoint: vi.fn(),
    toggleHideBalance: vi.fn(),
    setFiatCurrency,
    setIsDesktop: vi.fn(),
    setSignTxDialogVisibility: vi.fn(),
    useCeresApiForFiatValues: vi.fn(),
    notifyOnDeposit: vi.fn(),
    selectIndexer,
    setApiKeys: vi.fn(),
    toggleTheme: vi.fn(),
    subscribeOnExchangeRatesApi: vi.fn(),
    resetNetworkSubscriptions: vi.fn(),
    resetInternalSubscriptions: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useTransaction', () => ({
  useTransaction: () => ({
    t: (key: string) => key,
    account: { value: null },
    handleChangeTransaction: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/SoraWallet.vue', () => ({
  default: { name: 'SoraWalletStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/ConfirmDialog.vue', () => ({
  default: { name: 'ConfirmDialogStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletProviders.vue', () => ({
  default: { name: 'WalletProvidersStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/bootstrap', () => ({
  initWallet: vi.fn(async () => undefined),
}));

import App from '@/lib/soraneo-wallet/src/App.vue';
import { IndexerType } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet App', () => {
  it('toggles the selected indexer between subsquid and subquery', () => {
    const { state } = mountSetup(App as any, {}, { emit: vi.fn() });

    state.changeIndexer();

    expect(selectIndexer).toHaveBeenCalledWith(IndexerType.SUBQUERY);
  });

  it('delegates fiat currency changes through the computed setter', () => {
    const { state } = mountSetup(App as any, {}, { emit: vi.fn() });

    state.appCurrency.value = 'USD';

    expect(setFiatCurrency).toHaveBeenCalledWith('USD');
  });
});

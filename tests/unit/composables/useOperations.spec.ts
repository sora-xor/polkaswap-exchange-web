import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/consts', () => ({
  HiddenValue: '***',
  accountIdBasedOperations: [Operation.Transfer],
}));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  formatAddress: (value: string) => `formatted-address:${value}`,
  groupRewardsByAssetsList: vi.fn(() => []),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    account: {
      address: 'sender-address',
      name: 'Sender',
      source: 'polkadot-js',
    },
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`,
  }),
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatStringValue: (value: string) => `formatted:${value}`,
  }),
}));

describe('useOperations', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('formats account-based operations with the active wallet account', async () => {
    const { useOperations } = await import('@/composables/useOperations');
    const { getOperationMessage } = useOperations();

    const result = getOperationMessage({
      type: Operation.Transfer,
      status: TransactionStatus.Finalized,
      from: 'sender-address',
      to: 'recipient-address',
      amount: '10',
      decimals: 18,
    } as any);

    expect(result).toContain('operations.Finalized.Transfer');
    expect(result).toContain('"action":"sentText:{}"');
    expect(result).toContain('"address":"formatted-address:recipient-address"');
    expect(result).toContain('"direction":"transaction.to:{}"');
    expect(result).toContain('"amount":"formatted:10"');
  });
});

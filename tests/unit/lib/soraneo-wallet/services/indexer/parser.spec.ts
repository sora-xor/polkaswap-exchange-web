import { describe, expect, it, vi } from 'vitest';

import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: () => ({}),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    assetsDataTable: {
      [XOR.address]: XOR,
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: { api: null },
    assets: {
      getAssetInfo: vi.fn(),
    },
  },
}));

describe('IndexerDataParser', () => {
  it('parses batched burn transactions and exposes the system remark', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');
    const remark = JSON.stringify({
      type: 'soraNexusXorClaim',
      version: 1,
      recipient: 'sora-recipient',
    });

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem({
      id: 'tx-id',
      module: 'utility',
      method: 'batchAll',
      address: 'sender',
      blockHash: 'block-hash',
      blockHeight: '100',
      timestamp: 10,
      networkFee: '0',
      execution: { success: true, error: null },
      data: {},
      calls: [
        {
          hash: 'burn-call',
          module: 'assets',
          method: 'burn',
          data: {
            args: {
              assetId: XOR.address,
              amount: '2000000000000000000',
              amountUSD: '0',
            },
          },
        },
        {
          hash: 'remark-call',
          module: 'system',
          method: 'remark',
          data: {
            args: {
              remark: `0x${Buffer.from(remark).toString('hex')}`,
            },
          },
        },
      ],
    } as any);

    expect(parsed).toMatchObject({
      type: Operation.Burn,
      amount: '2',
      assetAddress: XOR.address,
      symbol: XOR.symbol,
      comment: remark,
      payload: {
        amountUSD: '0',
        comment: remark,
      },
    });
  });
});

import { describe, expect, it, vi } from 'vitest';

import { Operation, TransactionStatus } from '@sora-substrate/sdk';
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

  it('parses Polkaswap indexer bridgeProxy burn history as EVM bridge outgoing history', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem({
      id: '0xsoratx',
      module: 'bridgeProxy',
      method: 'burn',
      address: 'sora-address',
      blockHash: '0xblock',
      blockHeight: '101',
      timestamp: 11,
      networkFee: '0',
      execution: { success: true, error: null },
      dataFrom: 'sora-address',
      dataTo: '0xevm-recipient',
      data: {
        assetId: XOR.address,
        amount: '2000000000000000000',
        networkId: { EVM: '0x6f' },
        recipient: '0xevm-recipient',
        requestHash: '0xrequest',
        status: 'Failed',
      },
      calls: [],
    } as any);

    expect(parsed).toMatchObject({
      id: '0xsoratx',
      type: Operation.EvmOutgoing,
      amount: '2',
      assetAddress: XOR.address,
      symbol: XOR.symbol,
      to: '0xevm-recipient',
      hash: '0xrequest',
      externalNetwork: 111,
      status: TransactionStatus.Error,
    });
  });

  it('parses normalized Polkaswap indexer bridgeProxy mint history as EVM bridge incoming history', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem({
      id: '0xincoming',
      module: 'bridgeProxy',
      method: 'mint',
      address: 'relayer',
      blockHash: '0xblock',
      blockHeight: '102',
      timestamp: 12,
      networkFee: '0',
      execution: { success: true, error: null },
      dataFrom: 'sora-address',
      dataTo: 'sora-address',
      data: {
        assetId: XOR.address,
        amount: '3',
        amountUSD: '1.5',
        networkId: 111,
        sender: '0xevm-sender',
        recipient: 'sora-address',
        requestHash: '0xincoming-request',
      },
      calls: [],
    } as any);

    expect(parsed).toMatchObject({
      type: Operation.EvmIncoming,
      amount: '3',
      assetAddress: XOR.address,
      symbol: XOR.symbol,
      from: 'sora-address',
      to: '0xevm-sender',
      hash: '0xincoming-request',
      externalNetwork: 111,
    });
  });

  it('rejects bridgeProxy EVM history without the required asset or amount fields', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');
    const parser = new IndexerDataParser();

    await expect(
      parser.parseTransactionAsHistoryItem({
        id: '0xmissing-asset',
        module: 'bridgeProxy',
        method: 'burn',
        address: 'sora-address',
        blockHash: '0xblock',
        blockHeight: '103',
        timestamp: 13,
        networkFee: '0',
        execution: { success: true, error: null },
        data: {
          amount: '1000000000000000000',
          networkId: { EVM: '0x6f' },
          recipient: '0xevm-recipient',
        },
        calls: [],
      } as any)
    ).resolves.toBeNull();
    await expect(
      parser.parseTransactionAsHistoryItem({
        id: '0xmissing-amount',
        module: 'bridgeProxy',
        method: 'mint',
        address: 'relayer',
        blockHash: '0xblock',
        blockHeight: '104',
        timestamp: 14,
        networkFee: '0',
        execution: { success: true, error: null },
        data: {
          assetId: XOR.address,
          networkId: 111,
          sender: '0xevm-sender',
          recipient: 'sora-address',
        },
        calls: [],
      } as any)
    ).resolves.toBeNull();
  });

  it.each([
    ['zero codec', '0'],
    ['negative codec', '-1000000000000000000'],
    ['decimal codec', '1000000000000000000.5'],
    ['comma-separated codec', '1,000000000000000000'],
    ['blank codec', ' '],
    ['non-numeric codec', 'not-a-number'],
  ])('rejects bridgeProxy burn history with %s amount', async (_case, amount) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    await expect(
      new IndexerDataParser().parseTransactionAsHistoryItem({
        id: `0xbad-burn-${_case}`,
        module: 'bridgeProxy',
        method: 'burn',
        address: 'sora-address',
        blockHash: '0xblock',
        blockHeight: '105',
        timestamp: 15,
        networkFee: '0',
        execution: { success: true, error: null },
        data: {
          assetId: XOR.address,
          amount,
          networkId: { EVM: '0x6f' },
          recipient: '0xevm-recipient',
          requestHash: '0xrequest',
        },
        calls: [],
      } as any)
    ).resolves.toBeNull();
  });

  it.each([
    ['zero natural', '0'],
    ['negative natural', '-1'],
    ['comma-separated natural', '1,000'],
    ['blank natural', ' '],
    ['non-numeric natural', 'not-a-number'],
  ])('rejects bridgeProxy mint history with %s amount', async (_case, amount) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    await expect(
      new IndexerDataParser().parseTransactionAsHistoryItem({
        id: `0xbad-mint-${_case}`,
        module: 'bridgeProxy',
        method: 'mint',
        address: 'relayer',
        blockHash: '0xblock',
        blockHeight: '105',
        timestamp: 15,
        networkFee: '0',
        execution: { success: true, error: null },
        data: {
          assetId: XOR.address,
          amount,
          amountUSD: '1',
          networkId: 111,
          sender: '0xevm-sender',
          recipient: 'sora-address',
          requestHash: '0xincoming-request',
        },
        calls: [],
      } as any)
    ).resolves.toBeNull();
  });

  it('does not throw or assign a network for malformed bridgeProxy EVM network variants', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem({
      id: '0xmalformed-network',
      module: 'bridgeProxy',
      method: 'burn',
      address: 'sora-address',
      blockHash: '0xblock',
      blockHeight: '105',
      timestamp: 15,
      networkFee: '0',
      execution: { success: true, error: null },
      dataFrom: 'sora-address',
      dataTo: '0xevm-recipient',
      data: {
        assetId: XOR.address,
        amount: '1000000000000000000',
        networkId: { EVM: '0xnot-hex' },
        recipient: { EVM: '0xevm-recipient' },
        requestHash: '0xrequest',
      },
      calls: [],
    } as any);

    expect(parsed).toMatchObject({
      type: Operation.EvmOutgoing,
      amount: '1',
      to: '0xevm-recipient',
    });
    expect((parsed as any).externalNetwork).toBeUndefined();
  });

  it.each([
    ['negative number', -1],
    ['fractional number', 111.5],
    ['unsafe number', Number.MAX_SAFE_INTEGER + 1],
    ['unsafe bigint', BigInt(Number.MAX_SAFE_INTEGER) + 1n],
    ['zero hex', '0x0'],
    ['negative string', '-1'],
    ['fractional string', '111.5'],
    ['unsafe string', '9007199254740992'],
  ])('does not assign unsafe EVM network variants from %s', async (_case, networkId) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem({
      id: `0xunsafe-network-${String(networkId)}`,
      module: 'bridgeProxy',
      method: 'burn',
      address: 'sora-address',
      blockHash: '0xblock',
      blockHeight: '106',
      timestamp: 16,
      networkFee: '0',
      execution: { success: true, error: null },
      dataFrom: 'sora-address',
      dataTo: '0xevm-recipient',
      data: {
        assetId: XOR.address,
        amount: '1000000000000000000',
        networkId,
        recipient: '0xevm-recipient',
        requestHash: '0xrequest',
      },
      calls: [],
    } as any);

    expect(parsed).toMatchObject({
      type: Operation.EvmOutgoing,
      amount: '1',
    });
    expect((parsed as any).externalNetwork).toBeUndefined();
  });

  it('maps refunded bridgeProxy statuses to failed bridge history even when the extrinsic succeeded', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem({
      id: '0xrefunded',
      module: 'bridgeProxy',
      method: 'burn',
      address: 'sora-address',
      blockHash: '0xblock',
      blockHeight: '106',
      timestamp: 16,
      networkFee: '0',
      execution: { success: true, error: null },
      dataFrom: 'sora-address',
      dataTo: '0xevm-recipient',
      data: {
        assetId: XOR.address,
        amount: '1000000000000000000',
        networkId: 111,
        recipient: '0xevm-recipient',
        requestHash: '0xrequest',
        status: 'Refunded',
      },
      calls: [],
    } as any);

    expect(parsed).toMatchObject({
      type: Operation.EvmOutgoing,
      status: TransactionStatus.Error,
      hash: '0xrequest',
    });
  });

  it('extracts nested bridgeProxy sender and recipient variants without swapping user ownership', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem({
      id: '0xnested-accounts',
      module: 'bridgeProxy',
      method: 'mint',
      address: 'relayer',
      blockHash: '0xblock',
      blockHeight: '107',
      timestamp: 17,
      networkFee: '0',
      execution: { success: true, error: null },
      dataFrom: 'sora-address',
      dataTo: 'sora-address',
      data: {
        assetId: XOR.address,
        amount: '2500000000000000000',
        networkId: { EVM: '0x6f' },
        sender: { EVM: '0xevm-sender' },
        recipient: { Sora: 'sora-address' },
        requestHash: '0xincoming-request',
      },
      calls: [],
    } as any);

    expect(parsed).toMatchObject({
      type: Operation.EvmIncoming,
      amount: '2.5',
      from: 'sora-address',
      to: '0xevm-sender',
      hash: '0xincoming-request',
      externalNetwork: 111,
    });
  });
});

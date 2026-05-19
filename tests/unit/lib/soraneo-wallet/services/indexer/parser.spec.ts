import { describe, expect, it, vi } from 'vitest';

import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { KUSD, XOR } from '@sora-substrate/sdk/build/assets/consts';

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: () => ({}),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    assetsDataTable: {
      [XOR.address]: XOR,
      [KUSD.address]: KUSD,
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

const walletAddress = 'cnRwt3q7DkvJqr3YkuN7dFibTx6yu8rqDDYKmBp4Sko5TW2Dd';
const liveSwapId = '0x8705a4a869a35f45c40528581601c4a99962d5f5cf8b77489fccf340e4212fbc';
const liveSwapData = {
  baseAssetId: XOR.address,
  targetAssetId: KUSD.address,
  selectedMarket: 'PoolXYK',
  baseAssetAmount: '0.803870313140829364',
  targetAssetAmount: '4.7',
  baseAssetAmountUSD: '4.80280251',
  targetAssetAmountUSD: '4.7',
};

const createLiveSwapHistoryElement = ({
  data,
  ...overrides
}: {
  data?: unknown;
  [key: string]: unknown;
} = {}) => ({
  id: liveSwapId,
  module: 'liquidityProxy',
  method: 'swap',
  address: walletAddress,
  dataFrom: walletAddress,
  dataTo: '',
  blockHash: '0xblock',
  blockHeight: '26166250',
  timestamp: 1778997216,
  networkFee: '0',
  execution: { success: true, error: null },
  data:
    data && typeof data === 'object' && !Array.isArray(data)
      ? {
          ...liveSwapData,
          ...(data as Record<string, unknown>),
        }
      : data === undefined
        ? liveSwapData
        : data,
  calls: [],
  ...overrides,
});

describe('IndexerDataParser', () => {
  it('parses pi.soramitsu.io account swap history rows used by wallet activity', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(createLiveSwapHistoryElement() as any);

    expect(parsed).toMatchObject({
      id: liveSwapId,
      type: Operation.Swap,
      from: walletAddress,
      assetAddress: XOR.address,
      asset2Address: KUSD.address,
      amount: '0.803870313140829364',
      amount2: '4.7',
      symbol: XOR.symbol,
      symbol2: KUSD.symbol,
      liquiditySource: 'PoolXYK',
      payload: {
        amountUSD: '4.80280251',
        amount2USD: '4.7',
      },
      status: TransactionStatus.Finalized,
    });
  });

  it.each([
    ['null transaction', null],
    ['array transaction', []],
    ['string transaction', 'liquidityProxy.swap'],
  ])('drops malformed top-level indexer rows with %s', async (_case, transaction) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await expect(new IndexerDataParser().parseTransactionAsHistoryItem(transaction as any)).resolves.toBeNull();
      expect(warn).toHaveBeenCalledWith('Unsupported transaction:', transaction);
    } finally {
      warn.mockRestore();
    }
  });

  it.each([
    ['null data payload', null],
    ['array data payload', []],
    ['missing base asset', { baseAssetId: '' }],
    ['missing target asset', { targetAssetId: '' }],
    ['numeric base asset', { baseAssetId: 42 }],
    ['object target asset', { targetAssetId: { address: KUSD.address } }],
    ['zero base amount', { baseAssetAmount: '0' }],
    ['zero target amount', { targetAssetAmount: '0' }],
    ['negative base amount', { baseAssetAmount: '-1' }],
    ['negative target amount', { targetAssetAmount: '-1' }],
    ['comma-separated base amount', { baseAssetAmount: '1,000' }],
    ['blank target amount', { targetAssetAmount: ' ' }],
    ['non-numeric base amount', { baseAssetAmount: 'not-a-number' }],
    ['NaN target amount', { targetAssetAmount: 'NaN' }],
    ['infinite base amount', { baseAssetAmount: 'Infinity' }],
    ['object target amount', { targetAssetAmount: { value: '4.7' } }],
  ])('drops malformed pi.soramitsu.io swap history rows with %s', async (_case, data) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    await expect(
      new IndexerDataParser().parseTransactionAsHistoryItem(createLiveSwapHistoryElement({ data }) as any)
    ).resolves.toBeNull();
  });

  it('normalizes malformed swap USD fields to zero without dropping valid token amounts', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement({
        data: {
          baseAssetAmountUSD: '<script>alert(1)</script>',
          targetAssetAmountUSD: '1,000',
        },
      }) as any
    );

    expect(parsed).toMatchObject({
      amount: '0.803870313140829364',
      amount2: '4.7',
      payload: {
        amountUSD: '0',
        amount2USD: '0',
      },
    });
  });

  it('normalizes adversarial swap USD field variants to zero', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement({
        data: {
          baseAssetAmountUSD: 'NaN',
          targetAssetAmountUSD: '-1',
        },
      }) as any
    );

    expect(parsed).toMatchObject({
      payload: {
        amountUSD: '0',
        amount2USD: '0',
      },
    });
  });

  it('ignores unsupported liquidityProxy methods instead of treating them as swaps', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      new IndexerDataParser().parseTransactionAsHistoryItem(
        createLiveSwapHistoryElement({
          method: 'swapEverything',
        }) as any
      )
    ).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Unsupported transaction:',
      expect.objectContaining({
        module: 'liquidityProxy',
        method: 'swapEverything',
      })
    );

    warn.mockRestore();
  });

  it.each([
    ['missing module', { module: undefined }],
    ['blank module', { module: '   ' }],
    ['missing method', { method: undefined }],
    ['blank method', { method: '   ' }],
  ])('drops rows with %s before reading transaction payloads', async (_case, overrides) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await expect(
        new IndexerDataParser().parseTransactionAsHistoryItem(createLiveSwapHistoryElement(overrides) as any)
      ).resolves.toBeNull();
      expect(warn).toHaveBeenCalledWith(
        'Unsupported transaction:',
        expect.objectContaining(overrides as Record<string, unknown>)
      );
    } finally {
      warn.mockRestore();
    }
  });

  it.each([
    ['missing id', { id: undefined }],
    ['blank id', { id: '   ' }],
    ['numeric id', { id: 42 }],
    ['object id', { id: { hash: liveSwapId } }],
  ])('drops otherwise valid swap rows with %s', async (_case, overrides) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    await expect(
      new IndexerDataParser().parseTransactionAsHistoryItem(createLiveSwapHistoryElement(overrides) as any)
    ).resolves.toBeNull();
  });

  it('trims transaction ids before exposing activity keys', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement({ id: ` ${liveSwapId} ` }) as any
    );

    expect(parsed).toMatchObject({
      id: liveSwapId,
      txId: liveSwapId,
    });
  });

  it.each([
    ['missing block hash', { blockHash: undefined }],
    ['object block hash', { blockHash: { hash: '0xblock' } }],
  ])('normalizes %s metadata to an empty block id', async (_case, overrides) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement(overrides) as any
    );

    expect(parsed).toMatchObject({
      id: liveSwapId,
      blockId: '',
    });
  });

  it.each([
    ['missing block height', undefined],
    ['negative block height', '-1'],
    ['fractional block height', '42.5'],
    ['infinite block height', Number.POSITIVE_INFINITY],
    ['object block height', { value: 42 }],
  ])('normalizes %s metadata to zero', async (_case, blockHeight) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement({ blockHeight }) as any
    );

    expect(parsed).toMatchObject({
      id: liveSwapId,
      blockHeight: 0,
    });
  });

  it.each([
    ['missing execution', { execution: undefined }],
    ['null execution', { execution: null }],
  ])('treats %s metadata as failed instead of throwing', async (_case, overrides) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    await expect(
      new IndexerDataParser().parseTransactionAsHistoryItem(createLiveSwapHistoryElement(overrides) as any)
    ).resolves.toMatchObject({
      id: liveSwapId,
      type: Operation.Swap,
      status: TransactionStatus.Error,
    });
  });

  it.each([
    ['missing error', { execution: { success: false } }],
    ['null error', { execution: { success: false, error: null } }],
  ])('treats failed rows with %s metadata as failed without synthetic error text', async (_case, overrides) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement(overrides) as any
    );

    expect(parsed).toMatchObject({
      id: liveSwapId,
      type: Operation.Swap,
      status: TransactionStatus.Error,
    });
    expect(parsed?.errorMessage).toBeUndefined();
  });

  it.each([
    ['negative timestamp', -1],
    ['NaN timestamp', 'not-a-time'],
    ['infinite timestamp', Number.POSITIVE_INFINITY],
  ])('uses current time for %s metadata instead of surfacing invalid dates', async (_case, timestamp) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');
    const now = Date.UTC(2026, 0, 1);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await expect(
        new IndexerDataParser().parseTransactionAsHistoryItem(createLiveSwapHistoryElement({ timestamp }) as any)
      ).resolves.toMatchObject({
        endTime: now,
        startTime: now,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['missing fee', undefined],
    ['null fee', null],
    ['blank fee', '   '],
    ['negative fee', '-1'],
    ['NaN fee', 'NaN'],
    ['infinite fee', 'Infinity'],
    ['hex fee', '0x10'],
    ['script fee', '<script>alert(1)</script>'],
    ['exponential fee', '1e18'],
    ['single-value array fee', ['1']],
    ['array fee', ['1', '2']],
    ['object fee', { value: '1' }],
  ])('normalizes malformed network fee metadata from %s to zero', async (_case, networkFee) => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement({ networkFee }) as any
    );

    expect(parsed).toMatchObject({
      id: liveSwapId,
      soraNetworkFee: '0',
    });
  });

  it('keeps malformed module error metadata inert when the transaction failed', async () => {
    const { default: IndexerDataParser } = await import('@/lib/soraneo-wallet/src/services/indexer/parser');

    const parsed = await new IndexerDataParser().parseTransactionAsHistoryItem(
      createLiveSwapHistoryElement({
        execution: {
          success: false,
          error: {
            moduleErrorId: '<script>alert(1)</script>',
            moduleErrorIndex: {},
          },
        },
      }) as any
    );

    expect(parsed).toMatchObject({
      id: liveSwapId,
      status: TransactionStatus.Error,
      errorMessage: {
        name: '',
        section: '',
      },
    });
  });

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

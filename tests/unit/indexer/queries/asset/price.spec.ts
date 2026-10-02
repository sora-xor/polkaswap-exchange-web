import { beforeEach, describe, expect, it, vi } from 'vitest';
import { print } from 'graphql';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchAssetPriceData } from '@/indexer/queries/asset/price';
import { retryOnEmptyResult } from '@/indexer/queries/retry';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchEntities: vi.fn(),
  endpoint: 'https://mof.sora.org/graphql' as string | undefined,
  walletStoreUnavailable: false,
}));

vi.mock('@/plugins/pinia', () => ({ resolveGlobalPinia: () => undefined }));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => {
    if (indexerMocks.walletStoreUnavailable) throw new Error('Wallet store unavailable');
    return { indexers: { polkaswap: { endpoint: indexerMocks.endpoint } } };
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

vi.mock('@/indexer/queries/retry', () => ({
  retryOnEmptyResult: vi.fn(async (request, isEmpty) => {
    const result = await request();
    isEmpty(result);
    return result;
  }),
}));

describe('asset price query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
    indexerMocks.endpoint = 'https://mof.sora.org/graphql';
    indexerMocks.walletStoreUnavailable = false;
  });

  it.each([
    undefined,
    'https://testnet.example/graphql',
    'https://pi.soramitsu.io.other.example/graphql',
    'https://mof.sora.org.other.example/graphql',
    'https://mof.sora.org/another-indexer/graphql',
  ])('preserves the legacy query for an endpoint without the deployed schema: %s', async (endpoint) => {
    indexerMocks.endpoint = endpoint;
    indexerMocks.fetchEntities.mockResolvedValue(
      createSnapshotResponse([createSnapshotEntity('1700', 11, 12, 10, 13, 2)])
    );
    indexerMocks.currentIndexer = { services: { explorer: { fetchEntities: indexerMocks.fetchEntities } } };
    const result = await fetchAssetPriceData('xor-address', 'HOUR' as any);
    expect(print(indexerMocks.fetchEntities.mock.calls[0][0])).not.toContain('closeEvidence');
    expect(result?.edges[0]?.node.price).toEqual([11, 12, 10, 13]);
  });

  it('keeps the legacy schema when the wallet store is not ready', async () => {
    indexerMocks.walletStoreUnavailable = true;
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([]));
    indexerMocks.currentIndexer = { services: { explorer: { fetchEntities: indexerMocks.fetchEntities } } };
    await fetchAssetPriceData('xor-address', 'HOUR' as any);
    expect(print(indexerMocks.fetchEntities.mock.calls[0][0])).not.toContain('closeEvidence');
  });

  it.each(['https://mof.sora.org/graphql', 'https://pi.soramitsu.io/graphql'])(
    'fetches close evidence and preserves snapshot conversion for the known schema at %s',
    async (endpoint) => {
      indexerMocks.endpoint = endpoint;
      indexerMocks.fetchEntities.mockResolvedValue(
        createSnapshotResponse([createSnapshotEntity('1700', 11, 12, 10, 13, 42.5)])
      );
      indexerMocks.currentIndexer = {
        type: IndexerType.POLKASWAP,
        services: {
          explorer: {
            fetchEntities: indexerMocks.fetchEntities,
          },
        },
      };

      const result = await fetchAssetPriceData('xor-address', 'DAY' as any, 25, 'cursor-1');

      expect(retryOnEmptyResult).toHaveBeenCalledTimes(1);
      expect(print(indexerMocks.fetchEntities.mock.calls[0][0])).toContain('closeEvidence');
      expect(indexerMocks.fetchEntities).toHaveBeenCalledWith(expect.any(Object), {
        filter: {
          assetId: { equalTo: 'xor-address' },
          type: { equalTo: 'DAY' },
        },
        first: 25,
        after: 'cursor-1',
      });
      expect(result).toEqual({
        pageInfo: {
          hasNextPage: false,
          endCursor: 'end-cursor',
        },
        edges: [
          {
            cursor: 'edge-cursor-0',
            node: {
              timestamp: 1_700_000,
              price: [11, 12, 10, 13],
              volume: 42.5,
            },
          },
        ],
      });
    }
  );

  it('skips canonical close-only and unavailable rows without inventing candles or zero volume', async () => {
    const valid = createSnapshotEntity('1700', 11, 12, 10, 13, 0);
    indexerMocks.fetchEntities.mockResolvedValue(
      createSnapshotResponse([
        { timestamp: '1700', priceUSD: { close: '12' }, volume: null, closeEvidence: createCloseEvidence() },
        {
          timestamp: '1700',
          priceUSD: { close: '12' },
          volume: { amountUSD: '2' },
          closeEvidence: createCloseEvidence(),
        },
        { timestamp: '1698', priceUSD: { close: null }, volume: null },
        { ...valid, volume: null },
        { ...valid, priceUSD: null },
        valid,
      ])
    );
    indexerMocks.currentIndexer = { services: { explorer: { fetchEntities: indexerMocks.fetchEntities } } };
    const result = await fetchAssetPriceData('xor-address', 'HOUR' as any);
    expect(result?.edges).toEqual([
      { cursor: 'edge-cursor-5', node: { timestamp: 1700000, price: [11, 12, 10, 13], volume: 0 } },
    ]);
    expect(result?.pageInfo).toEqual({ hasNextPage: false, endCursor: 'end-cursor' });
  });

  it.each([
    { open: 5.24003923, close: '5.240039239316743512', low: 5.24003923, high: 5.24003923 },
    { open: 11, close: 20, low: 10, high: 13 },
    { open: 11, close: 7, low: 10, high: 13 },
  ])('includes the verified close $close in retained candle extrema', async ({ open, close, low, high }) => {
    const node = {
      ...createSnapshotEntity('1700', open, close, low, high, 42.5),
      closeEvidence: createCloseEvidence(),
    };
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([node]));
    indexerMocks.currentIndexer = { services: { explorer: { fetchEntities: indexerMocks.fetchEntities } } };
    const result = await fetchAssetPriceData('xor-address', 'HOUR' as any);
    expect(result?.edges[0]?.node).toEqual({
      timestamp: 1700000,
      price: [open, Number(close), Math.min(low, Number(close)), Math.max(high, Number(close))],
      volume: 42.5,
    });
    expect(node.priceUSD).toEqual({ open: String(open), close: String(close), low: String(low), high: String(high) });
  });

  it.each([
    null,
    {},
    { kind: 'finalized-hour-close', availability: 'priced' },
    { ...createCloseEvidence(), kind: 'sampled-close' },
    { ...createCloseEvidence(), availability: 'price-unavailable' },
    { ...createCloseEvidence(), nextBlockHeight: 103 },
    { ...createCloseEvidence(), nextTimestamp: 3599 },
    { ...createCloseEvidence(), timestamp: 1699 },
    { ...createCloseEvidence(), completedAt: 7200 },
    { ...createCloseEvidence(), blockHash: 'invalid' },
  ])('rejects a contradictory candle with invalid or unavailable close evidence %#', async (closeEvidence) => {
    const node = { ...createSnapshotEntity('1700', 11, 20, 10, 13, 2), closeEvidence };
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([node]));
    indexerMocks.currentIndexer = { services: { explorer: { fetchEntities: indexerMocks.fetchEntities } } };
    await expect(fetchAssetPriceData('xor-address', 'HOUR' as any)).resolves.toMatchObject({ edges: [] });
  });

  it('does not repair an inconsistent original open using evidence for only the close', async () => {
    const node = { ...createSnapshotEntity('1700', 9, 20, 10, 13, 2), closeEvidence: createCloseEvidence() };
    indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([node]));
    indexerMocks.currentIndexer = { services: { explorer: { fetchEntities: indexerMocks.fetchEntities } } };
    await expect(fetchAssetPriceData('xor-address', 'HOUR' as any)).resolves.toMatchObject({ edges: [] });
  });

  it.each(['zero', 'null', 'infinite', 'missing', 'inconsistent', 'negativeVolume', 'timestamp'])(
    'skips %s chart observations instead of returning NaN',
    async (fault) => {
      const valid = createSnapshotEntity('1700', 11, 12, 10, 13, 1);
      const node: Record<string, unknown> = { ...valid };
      if (fault === 'zero') node.priceUSD = { ...valid.priceUSD, close: '0' };
      if (fault === 'null') node.priceUSD = { ...valid.priceUSD, low: null };
      if (fault === 'infinite') node.priceUSD = { ...valid.priceUSD, close: 'Infinity' };
      if (fault === 'missing') node.priceUSD = { close: '12' };
      if (fault === 'inconsistent') node.priceUSD = { ...valid.priceUSD, close: '20' };
      if (fault === 'negativeVolume') node.volume = { amountUSD: '-1' };
      if (fault === 'timestamp') node.timestamp = 'bad timestamp';
      indexerMocks.fetchEntities.mockResolvedValue(createSnapshotResponse([node]));
      indexerMocks.currentIndexer = { services: { explorer: { fetchEntities: indexerMocks.fetchEntities } } };
      await expect(fetchAssetPriceData('xor-address', 'HOUR' as any)).resolves.toMatchObject({ edges: [] });
    }
  );

  it('returns null when the active indexer returns no snapshot connection data', async () => {
    indexerMocks.fetchEntities.mockResolvedValue(null);
    indexerMocks.currentIndexer = {
      type: IndexerType.POLKASWAP,
      services: {
        explorer: {
          fetchEntities: indexerMocks.fetchEntities,
        },
      },
    };

    await expect(fetchAssetPriceData('xor-address', 'DAY' as any)).resolves.toBeNull();
  });
});

const createSnapshotResponse = (nodes: unknown[]) => ({
  pageInfo: {
    hasNextPage: false,
    endCursor: 'end-cursor',
  },
  edges: nodes.map((node, index) => ({
    cursor: `edge-cursor-${index}`,
    node,
  })),
});

const createSnapshotEntity = (
  timestamp: string,
  open: number,
  close: number | string,
  low: number,
  high: number,
  volume: number
) => ({
  timestamp,
  priceUSD: {
    open: String(open),
    close: String(close),
    low: String(low),
    high: String(high),
  },
  volume: {
    amountUSD: String(volume),
  },
});

/** Adjacent finalized blocks surrounding the sample candle's completed hour. */
function createCloseEvidence() {
  return {
    kind: 'finalized-hour-close',
    availability: 'priced',
    timestamp: 1700,
    completedAt: 3600,
    blockHeight: 100,
    nextBlockHeight: 101,
    blockHash: `0x${'a'.repeat(64)}`,
    nextBlockHash: `0x${'b'.repeat(64)}`,
    nextTimestamp: 3601,
  };
}

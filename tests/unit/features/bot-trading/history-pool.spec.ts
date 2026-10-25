import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBotHistory } from '@/features/bot-trading/history';
import { botFixture } from './fixtures';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), at: vi.fn(), finalized: vi.fn() }));
const XOR = {
  address: '0x0200000000000000000000000000000000000000000000000000000000000000',
  symbol: 'XOR',
  decimals: 18,
};
const KUSD = { address: `0x${'c'.repeat(64)}`, symbol: 'KUSD', decimals: 6 };
const GENESIS = `0x${'a'.repeat(64)}`;
const HOUR = 3_600_000;
const END = Date.UTC(2026, 8, 13, 12);
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({ services: { explorer: { fetchEntities: mocks.fetch } } }),
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      endpoint: 'wss://fixture',
      api: {
        isConnected: true,
        genesisHash: { toString: () => `0x${'a'.repeat(64)}` },
        at: mocks.at,
        rpc: { chain: { getFinalizedHead: mocks.finalized } },
      },
    },
  },
}));

function bot() {
  return { ...botFixture(), assetIn: KUSD, assetOut: XOR, policy: { ...botFixture().policy, feeAsset: XOR } };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(END + 60000);
  mocks.finalized.mockResolvedValue('finalized');
  mocks.at.mockResolvedValue({ query: { denomination: { denominator: async () => ({ toString: () => '100' }) } } });
  mocks.fetch.mockImplementation(async (_query, variables) => {
    const asset = variables.filter.assetId.equalTo === XOR.address ? XOR : KUSD;
    return {
      pageInfo: { hasNextPage: false, endCursor: '' },
      edges: [
        {
          node: {
            timestamp: END / 1000 - 10,
            denominator: '100',
            priceUSD: { close: '9999' },
            closeEvidence: {
              kind: 'finalized-hour-close',
              genesisHash: GENESIS,
              completedAt: END / 1000,
              timestamp: END / 1000 - 10,
              blockHeight: 100,
              nextBlockHeight: 101,
              blockHash: `0x${'1'.repeat(64)}`,
              nextBlockHash: `0x${'2'.repeat(64)}`,
              nextTimestamp: END / 1000 + 1,
              requestedSymbol: asset.symbol,
              symbol: asset.symbol,
              decimals: asset.decimals,
              xorPool:
                asset.address === XOR.address
                  ? null
                  : {
                      baseAssetId: XOR.address,
                      targetAssetId: KUSD.address,
                      baseDecimals: 18,
                      targetDecimals: 6,
                      baseAssetReserves: '100000000000000000000',
                      targetAssetReserves: '700000000',
                    },
            },
          },
        },
      ],
    };
  });
});

describe('indexed pool history transport', () => {
  it('requests reserve evidence and binds it to current finalized denomination before deriving the pair', async () => {
    const result = await fetchBotHistory(bot(), {
      interval: 'hour',
      startAt: END - HOUR,
      endAt: END,
      basis: 'xor-pool',
    });
    expect(result.candles).toEqual([{ timestamp: END, close: '7', feeClose: '7' }]);
    expect(result.identity).toEqual({ genesisHash: GENESIS, denominator: '100' });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls[0][0].loc.source.body).toContain('BotClosedPoolPrices');
    expect(mocks.at).toHaveBeenCalledWith('finalized');
  });

  it('does not fall back to USD prices if the evidence query is unsupported', async () => {
    mocks.fetch.mockResolvedValue(null);
    await expect(fetchBotHistory(bot(), { interval: 'hour', days: 1, basis: 'xor-pool' })).rejects.toThrow(
      'bots.errors.history'
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps a denomination change as missing instead of relabeling old reserves', async () => {
    mocks.at.mockResolvedValue({ query: { denomination: { denominator: async () => ({ toString: () => '1000' }) } } });
    expect(
      await fetchBotHistory(bot(), { interval: 'hour', startAt: END - HOUR, endAt: END, basis: 'xor-pool' })
    ).toMatchObject({ candles: [], missing: 1, denominationVerified: false });
  });

  it('rejects day buckets before requesting the hourly-only evidence', async () => {
    await expect(fetchBotHistory(bot(), { interval: 'day', days: 1, basis: 'xor-pool' })).rejects.toThrow(
      'bots.errors.history'
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

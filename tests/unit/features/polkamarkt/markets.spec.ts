import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexerRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({
    services: {
      explorer: {
        request: indexerRequestMock,
      },
    },
  }),
}));

import {
  calculateCloseBlockFromDate,
  calculateCloseBlockFromBlockInput,
  calculateMinimumCloseBlock,
  filterMarkets,
  formatDateTimeLocalInput,
  isActiveMarket,
  isClaimableMarketStatus,
  metadataByteLength,
  normalizeMarketCategory,
  normalizeMarketOracle,
  parseProbability,
  validateMarketMetadata,
} from '@/features/polkamarkt/lib/markets';
import {
  fetchPolkamarktMarketHistory,
  marketHistoryFallback,
  marketRuntimeId,
  parseMarketHistoryPoint,
} from '@/features/polkamarkt/services/marketHistory';
import { parseMarket } from '@/features/polkamarkt/services/markets';

import type { PolkamarktMarket } from '@/features/polkamarkt/types';

const baseMarket = (overrides: Partial<PolkamarktMarket> = {}): PolkamarktMarket => ({
  id: '1',
  chainId: 1,
  title: 'Will SORA ship Polkamarkt?',
  description: 'A native prediction market',
  category: 'Crypto',
  liquidity: 100,
  volume: 25,
  status: 'Open',
  ...overrides,
});

describe('polkamarkt market helpers', () => {
  beforeEach(() => {
    indexerRequestMock.mockReset();
  });

  it('normalizes categories and aliases from indexed metadata', () => {
    expect(normalizeMarketCategory('Crypto')).toBe('Crypto');
    expect(normalizeMarketCategory('governance')).toBe('Politics');
    expect(normalizeMarketCategory('unknown')).toBeUndefined();
  });

  it('normalizes SORA governance oracle labels from indexed metadata', () => {
    expect(normalizeMarketOracle('SORA Council and Technical Committee')).toBe('SORA On-Chain Governance');
    expect(normalizeMarketOracle('SORA governance')).toBe('SORA On-Chain Governance');
    expect(normalizeMarketOracle('Maritime desk')).toBe('Maritime desk');
    expect(normalizeMarketOracle('')).toBeUndefined();
  });

  it('parses current and legacy market records safely', () => {
    expect(
      parseMarket({
        id: 'market-7',
        marketId: '7',
        conditionId: '4',
        title: 'Will SORA volume grow?',
        category: 'tokenomics',
        oracle: 'SORA Council and Technical Committee',
        closeBlock: '12,000',
        liquidityUSD: '1000',
        volumeUsd: '250',
        priceYes: '0.72',
      })
    ).toMatchObject({
      id: 'market-7',
      chainId: 7,
      conditionId: 4,
      category: 'Crypto',
      oracle: 'SORA On-Chain Governance',
      probability: 72,
      closeBlock: 12000,
    });

    expect(parseMarket({ id: 'bad' })).toBeNull();
  });

  it('filters active, finalized, search, category, and account-owned markets', () => {
    const markets = [
      baseMarket({ creator: 'cnAlice' }),
      baseMarket({ id: '2', chainId: 2, category: 'Sports', status: 'Resolved', creator: 'cnBob', title: 'Sports result' }),
    ];

    expect(isActiveMarket(markets[0])).toBe(true);
    expect(isActiveMarket(markets[1])).toBe(false);
    expect(filterMarkets(markets, { status: 'active' })).toEqual([markets[0]]);
    expect(filterMarkets(markets, { status: 'finalized' })).toEqual([markets[1]]);
    expect(filterMarkets(markets, { status: 'all', category: 'Sports' })).toEqual([markets[1]]);
    expect(filterMarkets(markets, { status: 'all', search: 'ship' })).toEqual([markets[0]]);
    expect(filterMarkets(markets, { status: 'all', account: 'cnalice', mineOnly: true })).toEqual([markets[0]]);
  });

  it('recognizes only resolved or cancelled markets as claimable', () => {
    expect(isClaimableMarketStatus('Resolved')).toBe(true);
    expect(isClaimableMarketStatus('cancelled')).toBe(true);
    expect(isClaimableMarketStatus('canceled')).toBe(true);
    expect(isClaimableMarketStatus('Open')).toBe(false);
    expect(isClaimableMarketStatus('Closed')).toBe(false);
  });

  it('validates metadata bytes and close block minimum duration', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-31T00:00:00Z'));

      expect(metadataByteLength('market')).toBe(6);
      expect(validateMarketMetadata('short', 'oracle', 'source')).toContain('questionTooShort');
      expect(validateMarketMetadata('Will this question be long enough for the pallet?', 'oracle', 'source')).toEqual([]);

      const deadline = new Date('2026-05-31T00:01:00Z');
      expect(calculateCloseBlockFromDate(100, deadline)).toBe(7300);
      expect(calculateMinimumCloseBlock(100)).toBe(7300);
      expect(calculateCloseBlockFromBlockInput(100, '200')).toBe(7300);
      expect(calculateCloseBlockFromBlockInput(100, '14,500')).toBe(14500);
    } finally {
      vi.useRealTimers();
    }
  });

  it('formats linked close-block dates for datetime-local controls', () => {
    expect(formatDateTimeLocalInput(new Date(2026, 4, 31, 12, 34))).toBe('2026-05-31T12:34:00');
    expect(formatDateTimeLocalInput(new Date('invalid'))).toBe('');
  });

  it('normalizes probability values from ratio or percentage fields', () => {
    expect(parseProbability('0.51')).toBe(51);
    expect(parseProbability('51')).toBe(51);
    expect(parseProbability('bad')).toBeUndefined();
  });

  it('parses indexed market history and falls back to the current probability', async () => {
    expect(
      parseMarketHistoryPoint({
        id: 'market-7-BLOCK-10',
        marketId: '7',
        timestamp: '1780229164',
        blockHeight: '10',
        probability: '0.54',
        priceYes: '0.54',
        priceNo: '0.46',
        liquidityUSD: '250',
        volumeUsd: '30',
        status: 'Open',
      })
    ).toMatchObject({
      id: 'market-7-BLOCK-10',
      marketId: 7,
      blockHeight: 10,
      probability: 54,
      priceYes: 0.54,
      priceNo: 0.46,
      liquidityUSD: 250,
      volumeUSD: 30,
      status: 'Open',
    });

    expect(parseMarketHistoryPoint({ id: 'bad' })).toBeNull();
    expect(marketRuntimeId(baseMarket({ id: '42', chainId: undefined }))).toBe(42);
    expect(marketHistoryFallback(baseMarket({ probability: 63 }))).toMatchObject([
      {
        id: 'current-1',
        marketId: 1,
        probability: 63,
        priceYes: 0.63,
        priceNo: 0.37,
      },
    ]);

    indexerRequestMock.mockResolvedValueOnce({
      marketSnapshots: {
        edges: [
          {
            node: {
              id: 'market-1-BLOCK-1',
              marketId: 1,
              timestamp: 1780229164,
              probability: 54,
              priceYes: 0.54,
              priceNo: 0.46,
            },
          },
        ],
      },
    });

    await expect(fetchPolkamarktMarketHistory(baseMarket())).resolves.toMatchObject([
      {
        id: 'market-1-BLOCK-1',
        marketId: 1,
        probability: 54,
      },
    ]);
    expect(indexerRequestMock).toHaveBeenCalledWith(expect.anything(), { marketId: 1, limit: 96 });

    indexerRequestMock.mockResolvedValueOnce({ marketSnapshots: { edges: [] } });
    await expect(fetchPolkamarktMarketHistory(baseMarket({ probability: 51 }))).resolves.toMatchObject([
      {
        id: 'current-1',
        probability: 51,
      },
    ]);
  });
});

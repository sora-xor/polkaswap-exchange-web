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
  formatApproximateCloseDate,
  formatDateTimeLocalInput,
  getMarketDisplayStatus,
  isActiveMarket,
  isClaimableMarketStatus,
  isFinalizedMarket,
  isMarketClosedByBlock,
  metadataByteLength,
  normalizeMarketCategory,
  normalizeMarketOracle,
  parseProbability,
  validateMarketMetadata,
} from '@/features/polkamarkt/lib/markets';
import {
  getPricingCurvePosition,
  isDpmMarket,
  pricingCurveSharePrice,
} from '@/features/polkamarkt/lib/pricingCurve';
import {
  fetchPolkamarktMarketHistory,
  marketHistoryFallback,
  marketRuntimeId,
  parseMarketHistoryPoint,
} from '@/features/polkamarkt/services/marketHistory';
import { fetchPolkamarktMarkets, parseMarket } from '@/features/polkamarkt/services/markets';
import { mergePolkamarktMarkets, parseRuntimePolkamarktMarket } from '@/features/polkamarkt/services/runtimeMarkets';

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

  it('derives DPM curve demand from virtual and real share reserves', () => {
    const position = getPricingCurvePosition(
      baseMarket({
        mechanism: 'DynamicPariMutuel',
        virtualDepth: 100,
        realYesShares: 150,
        realNoShares: 50,
        dpmCollateral: 275,
      })
    );

    expect(isDpmMarket(baseMarket({ mechanism: 'DynamicPariMutuel' }))).toBe(true);
    expect(position.yesDemand).toBeCloseTo(62.5);
    expect(position.noDemand).toBeCloseTo(37.5);
    expect(position.yesQuote).toBeCloseTo(pricingCurveSharePrice(0.625));
    expect(position.noQuote).toBeCloseTo(pricingCurveSharePrice(0.375));
    expect(position.collateral).toBe(275);
  });

  it('prefers indexed DPM bps quotes over derived curve quotes', () => {
    const position = getPricingCurvePosition(
      baseMarket({
        mechanism: 'DynamicPariMutuel',
        probability: 60,
        impliedYesProbabilityBps: 6250,
        marginalYesPriceBps: 5100,
        marginalNoPriceBps: 4900,
      })
    );

    expect(position.yesDemand).toBeCloseTo(62.5);
    expect(position.yesQuote).toBe(0.51);
    expect(position.noQuote).toBe(0.49);
  });

  it('falls back safely for partial or non-DPM curve state', () => {
    expect(isDpmMarket(baseMarket({ mechanism: 'MigratedLegacy', virtualDepth: 100 }))).toBe(false);
    expect(getPricingCurvePosition(undefined)).toEqual({
      yesDemand: undefined,
      noDemand: undefined,
      yesQuote: undefined,
      noQuote: undefined,
      collateral: undefined,
    });

    const position = getPricingCurvePosition(baseMarket({ mechanism: 'DynamicPariMutuel', probability: 70 }));
    expect(position.yesDemand).toBe(70);
    expect(position.yesQuote).toBeCloseTo(pricingCurveSharePrice(0.7));
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

  it('parses runtime markets and merges chain-only markets after indexed data', async () => {
    const runtimeStorage = {
      conditions: vi.fn().mockResolvedValue({
        question: 'Will GPT 5.6 ship before the market deadline?',
        oracle: 'SORA Council and Technical Committee',
        resolutionSource: 'Weekly SORA governance resolution batch',
      }),
      conditionDetails: vi.fn().mockResolvedValue({ category: 'AI' }),
      marketDpmCollateral: vi.fn().mockResolvedValue('0'),
      marketPositionTotals: vi.fn().mockResolvedValue({ totalYesShares: '0', totalNoShares: '1000000000000000000' }),
      marketVolume: vi.fn().mockResolvedValue('0'),
      marketCreatorFees: vi.fn().mockResolvedValue('0'),
    };
    const runtimeMarket = await parseRuntimePolkamarktMarket(runtimeStorage, 1, {
      conditionId: 2,
      creator: 'cnCreator',
      closeBlock: '26,590,569',
      status: 'Open',
      mechanism: 'DynamicPariMutuel',
    });

    expect(runtimeMarket).toMatchObject({
      id: '1',
      chainId: 1,
      conditionId: 2,
      category: 'AI',
      oracle: 'SORA On-Chain Governance',
      title: 'Will GPT 5.6 ship before the market deadline?',
      closeBlock: 26590569,
      status: 'Open',
    });
    expect(runtimeMarket?.probability).toBe(0);

    const indexedMarket = baseMarket({ id: 'indexed-0', chainId: 0, volume: 5 });
    expect(mergePolkamarktMarkets([indexedMarket], [runtimeMarket as PolkamarktMarket])).toEqual([
      indexedMarket,
      runtimeMarket,
    ]);
    expect(
      mergePolkamarktMarkets([indexedMarket], [{ ...(runtimeMarket as PolkamarktMarket), chainId: 0, id: '0' }])
    ).toEqual([indexedMarket]);
  });

  it('decodes pending early resolution reports from runtime storage', async () => {
    const runtimeStorage = {
      conditions: vi.fn().mockResolvedValue({
        question: 'Will GPT 5.6 ship before the market deadline?',
        oracle: 'SORA On-Chain Governance',
        resolutionSource: 'Weekly SORA governance resolution batch',
      }),
      conditionDetails: vi.fn().mockResolvedValue({ category: 'AI' }),
      marketDpmCollateral: vi.fn().mockResolvedValue('0'),
      marketPositionTotals: vi.fn().mockResolvedValue({ totalYesShares: '0', totalNoShares: '0' }),
      marketVolume: vi.fn().mockResolvedValue('0'),
      marketCreatorFees: vi.fn().mockResolvedValue('0'),
      earlyResolutionReports: vi.fn().mockResolvedValue({
        reporter: 'cnReporter',
        outcome: 'Yes',
        bond: '100000000000000000000',
        evidence: {
          uri: [104, 116, 116, 112, 115, 58, 47, 47, 111, 112, 101, 110, 97, 105, 46, 99, 111, 109],
          hash: [1, 2, 3],
          atBlock: '321',
        },
      }),
    };

    const runtimeMarket = await parseRuntimePolkamarktMarket(runtimeStorage, 2, {
      conditionId: 2,
      creator: 'cnCreator',
      closeBlock: '26,590,569',
      status: 'Locked',
      mechanism: 'DynamicPariMutuel',
    });

    expect(runtimeMarket).toMatchObject({
      earlyResolutionOutcome: 'YES',
      earlyResolutionReporter: 'cnReporter',
      earlyResolutionBond: 100,
      earlyResolutionEvidenceUri: 'https://openai.com',
      earlyResolutionEvidenceHash: '0x010203',
      earlyResolutionEvidenceBlock: 321,
    });
    expect(getMarketDisplayStatus(runtimeMarket as PolkamarktMarket, 100)).toBe('Early report locked');
    expect(isActiveMarket(runtimeMarket as PolkamarktMarket, 100)).toBe(false);
    expect(
      mergePolkamarktMarkets([baseMarket({ chainId: 2, status: 'Open' })], [runtimeMarket as PolkamarktMarket])
    ).toMatchObject([
      {
        chainId: 2,
        status: 'Locked',
        earlyResolutionOutcome: 'YES',
        earlyResolutionEvidenceUri: 'https://openai.com',
      },
    ]);
  });

  it('appends runtime markets when the indexer has not caught up', async () => {
    indexerRequestMock.mockResolvedValueOnce({
      markets: {
        edges: [
          {
            node: {
              id: 'indexed-0',
              marketId: 0,
              title: 'Indexed market',
              category: 'Crypto',
              liquidityUSD: '100',
              volumeUSD: '10',
              status: 'Open',
            },
          },
        ],
      },
    });

    const api = {
      query: {
        polkamarkt: {
          markets: {
            entries: vi.fn().mockResolvedValue([
              [
                { args: [1] },
                {
                  conditionId: 2,
                  creator: 'cnCreator',
                  closeBlock: 26590569,
                  status: 'Open',
                },
              ],
            ]),
          },
          conditions: vi.fn().mockResolvedValue({
            question: 'Will GPT 5.6 ship before the market deadline?',
            oracle: 'SORA On-Chain Governance',
            resolutionSource: 'Weekly SORA governance resolution batch',
          }),
          conditionDetails: vi.fn().mockResolvedValue({ category: 'AI' }),
          marketDpmCollateral: vi.fn().mockResolvedValue('0'),
          marketPositionTotals: vi.fn().mockResolvedValue({ totalYesShares: '0', totalNoShares: '0' }),
          marketVolume: vi.fn().mockResolvedValue('0'),
          marketCreatorFees: vi.fn().mockResolvedValue('0'),
        },
      },
    };

    await expect(fetchPolkamarktMarkets({ api: api as never })).resolves.toMatchObject([
      { chainId: 0, title: 'Indexed market' },
      { chainId: 1, title: 'Will GPT 5.6 ship before the market deadline?' },
    ]);
  });

  it('falls back to the legacy market query when the latest indexed schema is unavailable', async () => {
    indexerRequestMock
      .mockRejectedValueOnce(new Error('Cannot query field "dpmCollateral" on type "Market"'))
      .mockResolvedValueOnce({
        markets: {
          edges: [
            {
              node: {
                id: 'legacy-3',
                marketId: 3,
                title: 'Legacy indexed market',
                category: 'Crypto',
                liquidityUSD: '100',
                volumeUSD: '10',
                status: 'Open',
              },
            },
          ],
        },
      });

    await expect(fetchPolkamarktMarkets({ api: null })).resolves.toMatchObject([
      { chainId: 3, title: 'Legacy indexed market' },
    ]);
    expect(indexerRequestMock).toHaveBeenCalledTimes(2);
  });

  it('filters active, finalized, search, category, and account-owned markets', () => {
    const markets = [
      baseMarket({ creator: 'cnAlice' }),
      baseMarket({
        id: '2',
        chainId: 2,
        category: 'Sports',
        status: 'Resolved',
        creator: 'cnBob',
        title: 'Sports result',
      }),
      baseMarket({ id: '3', chainId: 3, closeBlock: 100, creator: 'cnCarol', title: 'Closed by block' }),
      baseMarket({
        id: '4',
        chainId: 4,
        status: 'Open',
        title: 'Stale indexed early report',
        earlyResolutionOutcome: 'YES',
      }),
      baseMarket({
        id: '5',
        chainId: 5,
        status: 'Resolved',
        title: 'Settled result',
        earlyResolutionOutcome: 'YES',
      }),
    ];

    expect(isActiveMarket(markets[0])).toBe(true);
    expect(isActiveMarket(markets[1])).toBe(false);
    expect(isMarketClosedByBlock(markets[2], 100)).toBe(true);
    expect(isActiveMarket(markets[2], 101)).toBe(false);
    expect(isFinalizedMarket(markets[2], 101)).toBe(true);
    expect(getMarketDisplayStatus(markets[2], 101)).toBe('Closed');
    expect(getMarketDisplayStatus(markets[3], 101)).toBe('Early report locked');
    expect(isActiveMarket(markets[3], 101)).toBe(false);
    expect(getMarketDisplayStatus(markets[4], 101)).toBe('Resolved');
    expect(filterMarkets(markets, { status: 'active', currentBlock: 101 })).toEqual([markets[0]]);
    expect(filterMarkets(markets, { status: 'finalized', currentBlock: 101 })).toEqual([
      markets[1],
      markets[2],
      markets[4],
    ]);
    expect(filterMarkets(markets, { status: 'all', category: 'Sports' })).toEqual([markets[1]]);
    expect(filterMarkets(markets, { status: 'all', search: 'ship' })).toEqual([markets[0]]);
    expect(filterMarkets(markets, { status: 'all', search: 'closed', currentBlock: 101 })).toEqual([markets[2]]);
    expect(filterMarkets(markets, { status: 'all', search: 'early report', currentBlock: 101 })).toEqual([markets[3]]);
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
      expect(validateMarketMetadata('Will this question be long enough for the pallet?', 'oracle', 'source')).toEqual(
        []
      );

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
    expect(formatDateTimeLocalInput(new Date(2026, 4, 31, 12, 34, 56))).toBe('2026-05-31T12:34');
    expect(formatDateTimeLocalInput(new Date('invalid'))).toBe('');
  });

  it('formats approximate close-block dates with timezone and no second precision', () => {
    const date = new Date(2026, 4, 31, 12, 34, 56);
    const offsetMinutes = -date.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffsetMinutes = Math.abs(offsetMinutes);
    const pad = (value: number): string => String(value).padStart(2, '0');
    const expectedOffset = `UTC${offsetSign}${pad(Math.floor(absoluteOffsetMinutes / 60))}:${pad(
      absoluteOffsetMinutes % 60
    )}`;

    expect(formatApproximateCloseDate(date)).toBe(
      `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(
        date.getMinutes()
      )} ${expectedOffset}`
    );
    expect(formatApproximateCloseDate(date)).not.toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(formatApproximateCloseDate(new Date('invalid'))).toBe('');
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

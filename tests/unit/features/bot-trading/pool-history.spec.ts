import { describe, expect, it, vi } from 'vitest';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import {
  parseIndexedPoolHistory,
  parseIndexedPoolHistoryWithEvidence,
  type IndexedPoolHistoryRow,
} from '@/features/bot-trading/pool-history';
import type { BotAsset } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';

vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));

const HOUR = 3_600_000;
const START = Date.UTC(2026, 8, 13);
const KUSD = { address: `0x${'c'.repeat(64)}`, symbol: 'KUSD', decimals: 6 };
const VAL = { address: `0x${'b'.repeat(64)}`, symbol: 'VAL', decimals: 2 };
const context = { startAt: START, endAt: START + HOUR, genesisHash: `0x${'a'.repeat(64)}`, denominator: '100' };

/** Synthetic exact reserves: one XOR costs 7 KUSD, or 2 VAL. No real prices or network access. */
function observation(asset: BotAsset, offset = 0) {
  const open = START / 1000 + offset * 3600;
  return {
    timestamp: open + 3590,
    denominator: context.denominator,
    priceUSD: { close: asset.symbol === 'KUSD' ? '1' : '999' },
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: context.genesisHash,
      completedAt: open + 3600,
      timestamp: open + 3590,
      blockHeight: 100 + offset * 600,
      nextBlockHeight: 101 + offset * 600,
      blockHash: `0x${'1'.repeat(63)}${offset}`,
      nextBlockHash: `0x${'2'.repeat(63)}${offset}`,
      nextTimestamp: open + 3601,
      requestedSymbol: asset.symbol,
      symbol: asset.symbol,
      decimals: asset.decimals,
      xorPool:
        asset.address === XOR.address
          ? null
          : {
              baseAssetId: XOR.address,
              targetAssetId: asset.address,
              baseAssetReserves: '100000000000000000000',
              targetAssetReserves: asset.address === KUSD.address ? '700000000' : '20000',
              baseDecimals: 18,
              targetDecimals: asset.decimals,
            },
    },
  };
}

function harness() {
  const bot = botFixture();
  bot.assetIn = KUSD;
  bot.assetOut = XOR;
  bot.policy.feeAsset = XOR;
  const input = observation(KUSD),
    output = observation(XOR);
  const rows = new Map<string, IndexedPoolHistoryRow[]>([
    [KUSD.address, [input]],
    [XOR.address, [output]],
  ]);
  return { bot, input, output, rows, parse: () => parseIndexedPoolHistory(rows, bot, context) };
}

describe('same-state XOR pool history', () => {
  it('uses actual KUSD reserves despite a conflicting USD price and preserves exact fee orientation', () => {
    const h = harness();
    expect(h.parse()).toEqual({
      candles: [{ timestamp: START + HOUR, close: '7', feeClose: '7' }],
      missing: 0,
      denominationVerified: true,
      identity: { genesisHash: context.genesisHash, denominator: '100' },
    });
    h.input.priceUSD.close = '123';
    h.output.priceUSD.close = '50000';
    expect(h.parse().candles[0].close).toBe('7');
  });

  it('inverts an XOR-funded pair and values fees at one XOR', () => {
    const h = harness();
    [h.bot.assetIn, h.bot.assetOut] = [h.bot.assetOut, h.bot.assetIn];
    expect(h.parse().candles[0]).toMatchObject({ close: '0.142857142857142857142857142857142857', feeClose: '1' });
  });

  it('derives cross-token marks through two same-state XOR pools without using a peg', () => {
    const h = harness();
    h.bot.assetOut = VAL;
    h.rows.set(VAL.address, [observation(VAL)]);
    expect(h.parse().candles[0]).toMatchObject({ close: '3.5', feeClose: '7' });
  });

  it('keeps one-atom reserve precision above JavaScript safe integers', () => {
    const h = harness();
    h.bot.assetIn = { ...KUSD, decimals: 18 };
    h.input.closeEvidence.decimals = 18;
    h.input.closeEvidence.xorPool!.targetDecimals = 18;
    h.input.closeEvidence.xorPool!.baseAssetReserves = '1000000000000000000';
    h.input.closeEvidence.xorPool!.targetAssetReserves = '1000000000000000001';
    expect(h.parse().candles[0].close).toBe('1.000000000000000001');
  });

  it('accepts repeated real reserves from distinct completed blocks without manufacturing missing hours', () => {
    const h = harness();
    for (const asset of [KUSD, XOR]) h.rows.get(asset.address)!.push(observation(asset, 1));
    const result = parseIndexedPoolHistory(h.rows, h.bot, { ...context, endAt: START + 3 * HOUR });
    expect(result.candles).toHaveLength(2);
    expect(result.candles.map((c) => c.close)).toEqual(['7', '7']);
    expect(result.missing).toBe(1);
  });

  it('retains the exact indexed boundary alongside its candle without inventing millisecond block times', () => {
    const h = harness();
    const result = parseIndexedPoolHistoryWithEvidence(h.rows, h.bot, context);
    expect(result.history).toEqual(h.parse());
    expect(result.boundaries).toEqual([
      {
        kind: 'indexed-finalized-hour-boundary',
        completedAtMs: START + HOUR,
        genesisHash: context.genesisHash,
        denominator: context.denominator,
        closing: { height: 100, hash: h.input.closeEvidence.blockHash, timestampSeconds: START / 1000 + 3590 },
        successor: { height: 101, hash: h.input.closeEvidence.nextBlockHash, timestampSeconds: START / 1000 + 3601 },
        arrivalTimeKnown: false,
      },
    ]);
    expect(result.boundaries[0]).not.toHaveProperty('priceUSD');
    expect(result.boundaries[0].closing).not.toHaveProperty('parentHash');
    expect(result.boundaries[0].closing).not.toHaveProperty('timestampMs');
  });

  it('copies and freezes indexed provenance against later row or context mutation', () => {
    const h = harness();
    const sourceContext = { ...context };
    const result = parseIndexedPoolHistoryWithEvidence(h.rows, h.bot, sourceContext);
    const retained = JSON.stringify(result.boundaries);
    h.input.closeEvidence.blockHash = `0x${'f'.repeat(64)}`;
    h.input.closeEvidence.nextTimestamp++;
    sourceContext.genesisHash = `0x${'e'.repeat(64)}`;
    sourceContext.denominator = '1000';
    h.rows.clear();
    expect(JSON.stringify(result.boundaries)).toBe(retained);
    for (const value of [
      result,
      result.boundaries,
      result.boundaries[0],
      result.boundaries[0].closing,
      result.boundaries[0].successor,
    ])
      expect(Object.isFrozen(value)).toBe(true);
  });

  it('retains only accepted candle boundaries in time order across real gaps', () => {
    const h = harness();
    for (const asset of [KUSD, XOR]) {
      h.rows.get(asset.address)!.push(observation(asset, 2), observation(asset, 1));
    }
    const middle = h.rows.get(KUSD.address)![2];
    middle.closeEvidence = undefined;
    const result = parseIndexedPoolHistoryWithEvidence(h.rows, h.bot, { ...context, endAt: START + 3 * HOUR });
    expect(result.history.missing).toBe(1);
    expect(result.boundaries.map((item) => item.completedAtMs)).toEqual([START + HOUR, START + 3 * HOUR]);
    expect(result.boundaries.map((item) => item.completedAtMs)).toEqual(
      result.history.candles.map((item) => item.timestamp)
    );
    expect(result.boundaries.map((item) => item.closing.height)).toEqual([100, 1300]);
  });

  it.each([
    [
      'absent pool',
      (h: ReturnType<typeof harness>) => {
        delete (h.input.closeEvidence as Record<string, unknown>).xorPool;
      },
    ],
    [
      'null pool',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.xorPool = null;
      },
    ],
    [
      'legacy XOR',
      (h: ReturnType<typeof harness>) => {
        delete (h.output.closeEvidence as Record<string, unknown>).xorPool;
      },
    ],
    [
      'denomination',
      (h: ReturnType<typeof harness>) => {
        h.input.denominator = '1';
      },
    ],
    [
      'genesis',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.genesisHash = `0x${'f'.repeat(64)}`;
      },
    ],
    [
      'symbol',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.symbol = 'DAI';
      },
    ],
    [
      'precision',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.decimals = 18;
      },
    ],
    [
      'pool precision',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.xorPool!.targetDecimals = 18;
      },
    ],
    [
      'pool base',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.xorPool!.baseAssetId = KUSD.address;
      },
    ],
    [
      'wrong pair',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.xorPool!.targetAssetId = VAL.address;
      },
    ],
    [
      'unmatched state',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.blockHash = `0x${'3'.repeat(64)}`;
      },
    ],
    [
      'unmatched successor',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.nextBlockHash = `0x${'3'.repeat(64)}`;
      },
    ],
    [
      'unmatched time',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.nextTimestamp++;
      },
    ],
    [
      'nonadjacent block',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.nextBlockHeight++;
      },
    ],
    [
      'invalid block hash',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.blockHash = 'bad';
      },
    ],
    [
      'same block hash',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.blockHash = h.input.closeEvidence.nextBlockHash;
      },
    ],
    [
      'wrong completion',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.completedAt++;
      },
    ],
    [
      'forming hour',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.nextTimestamp = START / 1000 + 3599;
      },
    ],
    [
      'halted boundary',
      (h: ReturnType<typeof harness>) => {
        h.input.closeEvidence.nextTimestamp += 3600;
      },
    ],
    [
      'duplicate hour',
      (h: ReturnType<typeof harness>) => {
        h.rows.get(KUSD.address)!.push(structuredClone(h.input));
      },
    ],
    [
      'invalid then valid duplicate',
      (h: ReturnType<typeof harness>) => {
        h.rows.get(KUSD.address)!.unshift({ timestamp: h.input.timestamp });
      },
    ],
  ])('keeps %s as missing, regardless of the available USD price', (_name, change) => {
    const h = harness();
    change(h);
    expect(h.parse()).toMatchObject({ candles: [], missing: 1, denominationVerified: false });
    expect(parseIndexedPoolHistoryWithEvidence(h.rows, h.bot, context).boundaries).toEqual([]);
  });

  it.each(['0', '-1', '1.5', '1e18', '01', (1n << 128n).toString()])('rejects invalid reserve %s', (value) => {
    const h = harness();
    h.input.closeEvidence.xorPool!.baseAssetReserves = value;
    expect(h.parse().missing).toBe(1);
  });

  it('rejects evidence accessors without invoking them', () => {
    const h = harness();
    let reads = 0;
    Object.defineProperty(h.input.closeEvidence, 'xorPool', {
      get: () => {
        reads++;
        throw new Error();
      },
    });
    expect(h.parse().missing).toBe(1);
    expect(reads).toBe(0);
  });

  it('does not accept contradictory metadata when input is also the fee asset', () => {
    const h = harness();
    h.bot.assetIn = { ...XOR, decimals: 2 };
    h.bot.assetOut = KUSD;
    expect(h.parse).toThrow('bots.errors.history');
  });

  it.each([
    { startAt: START + 1 },
    { endAt: START },
    { endAt: START + 10001 * HOUR },
    { denominator: '0' },
    { denominator: (1n << 128n).toString() },
    { genesisHash: 'invalid' },
  ])('rejects invalid requested range or identity %o', (change) => {
    const h = harness();
    expect(() => parseIndexedPoolHistory(h.rows, h.bot, { ...context, ...change })).toThrow('bots.errors.history');
  });
});

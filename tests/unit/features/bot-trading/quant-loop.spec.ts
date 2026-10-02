// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  QUANT_AMOUNTS,
  QUANT_FOLDS,
  generateQuantCandidates,
  parseQuantArchive,
  prefixSums,
  quantCadence,
  quantSignalAt,
  replayQuantCandidate,
  runQuantLoop,
  type QuantCandidate,
  type QuantCosts,
  type QuantProgress,
} from '@/features/bot-trading/quant-loop';
import { evaluateStrategyRules, parseStrategyRules, requiredRuleCandles } from '@/features/bot-trading/strategy-rules';
import observedFees from '../../../fixtures/bot-trading/mainnetFees20260914.json';

const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const TOKEN = '0x0200050000000000000000000000000000000000000000000000000000000000';
const THIN = '0x0200090000000000000000000000000000000000000000000000000000000000';
const HOUR = 3_600_000;
const START = Date.UTC(2026, 2, 1, 1);
const E18 = 10n ** 18n;
/** Real finalized costs: 0.100020612589707326 XOR network fee and 0.6% pool fee. */
const COSTS: QuantCosts = {
  networkFeeXor: observedFees.networkFeeXor,
  swapFeePercent: '0.6',
  slippagePercent: '0.5',
};

/** Build a contiguous hourly archive; each price is XOR per token in thousandths. */
function archive(milliPrices: number[], options: { depth?: bigint; thin?: boolean; denominators?: string[] } = {}) {
  const depth = (options.depth ?? 60n) * E18;
  return {
    version: 1,
    kind: 'sora-pool-reserves-hourly',
    genesisHash: `0x${'7e'.repeat(32)}`,
    baseAsset: XOR,
    generatedAt: START + milliPrices.length * HOUR,
    assets: [
      { address: XOR, symbol: 'XOR' },
      { address: TOKEN, symbol: 'PSWAP' },
      ...(options.thin ? [{ address: THIN, symbol: 'XST' }] : []),
    ],
    rows: milliPrices.map((milli, index) => ({
      timestamp: START + index * HOUR,
      denominator: options.denominators?.[index] ?? '1',
      pools: {
        // Token reserve = depth / price, so the pool's spot price is exactly milli / 1000.
        [TOKEN]: [depth.toString(), ((depth * 1000n) / BigInt(milli)).toString()],
        ...(options.thin ? { [THIN]: [(5n * E18).toString(), (5000n * E18).toString()] } : {}),
      },
      metadata: {
        [XOR]: { symbol: 'XOR', decimals: 18 },
        [TOKEN]: { symbol: 'PSWAP', decimals: 18 },
        ...(options.thin ? { [THIN]: { symbol: 'XST', decimals: 18 } } : {}),
      },
    })),
  };
}

/** Flat 1.000 price, a 30% dislocation for twelve hours, then a recovery above the mean. */
function dislocation(hours = 400): number[] {
  return Array.from({ length: hours }, (_value, index) =>
    index >= 200 && index < 212 ? 700 : index >= 212 && index < 230 ? 1100 : 1000
  );
}

const candidate = (id: string) => {
  const found = generateQuantCandidates().find((item) => item.id === id);
  if (!found) throw new Error(`missing candidate ${id}`);
  return found;
};

describe('parseQuantArchive', () => {
  it('rebuilds exact closes and depth from u128 reserves', () => {
    const parsed = parseQuantArchive(archive([1000, 700, 1100]));
    expect(parsed.hours).toBe(3);
    expect(parsed.xor).toEqual({ address: XOR, symbol: 'XOR', decimals: 18 });
    const [market] = parsed.markets;
    expect(market.asset).toEqual({ address: TOKEN, symbol: 'PSWAP', decimals: 18 });
    expect(market.medianXorDepth).toBe(60);
    // close = xorReserve * 10^36 / tokenReserve, floored like the archive history loader.
    market.closeUnits.forEach((close, index) =>
      expect(close).toBe((market.xorReserves[index] * 10n ** 36n) / market.tokenReserves[index])
    );
    expect(market.closes[1]).toBeCloseTo(0.7, 12);
  });

  it('rejects malformed, gapped or re-denominated archives', () => {
    expect(() => parseQuantArchive({ ...archive([1000, 1000]), kind: 'other' })).toThrow('bots.errors.history');
    const gapped = archive([1000, 1000, 1000]);
    gapped.rows[2].timestamp += HOUR;
    expect(() => parseQuantArchive(gapped)).toThrow('bots.errors.history');
    expect(() => parseQuantArchive(archive([1000, 1000], { denominators: ['1', '2'] }))).toThrow('bots.errors.history');
    const overflow = archive([1000, 1000]);
    (overflow.rows[1].pools[TOKEN] as string[])[0] = (1n << 129n).toString();
    expect(() => parseQuantArchive(overflow)).toThrow('bots.errors.history');
  });
});

describe('generateQuantCandidates', () => {
  it('produces unique, canonical rule strategies accepted by the live rule parser', () => {
    const candidates = generateQuantCandidates();
    expect(candidates).toHaveLength(672);
    expect(new Set(candidates.map((item) => item.id)).size).toBe(candidates.length);
    for (const item of candidates) {
      expect(QUANT_AMOUNTS).toContain(item.amount);
      expect(parseStrategyRules(item.rules)).toEqual(item.rules);
    }
    expect(new Set(candidates.map((item) => item.family))).toEqual(
      new Set(['reversion', 'guarded', 'shock', 'trend', 'breakout'])
    );
  });
});

describe('replayQuantCandidate', () => {
  it('fills at the next hour with exact XYK output, fees and the protected fee reserve', () => {
    const parsed = parseQuantArchive(archive(dislocation()));
    const market = parsed.markets[0];
    const replay = replayQuantCandidate(market, candidate('reversion:24/20/5:2'), 0, market.timestamps.length, COSTS);
    const buys = replay.fills.filter((fill) => fill.side === 'buy');
    // 10 XOR capital, 2 XOR protected for fees: four 2 XOR buys fit before the reserve floor.
    expect(buys).toHaveLength(4);
    expect(buys[0].timestamp).toBe(START + 201 * HOUR);
    // Independent constant-product calculation for the first fill at hour 201.
    const x = market.xorReserves[201];
    const t = market.tokenReserves[201];
    const net = (2n * E18 * 994n) / 1000n;
    const out = (((net * t) / (x + net)) * 995n) / 1000n;
    expect(buys[0].output).toBe(`${out / E18}.${(out % E18).toString().padStart(18, '0')}`.replace(/\.?0+$/, ''));
    expect(buys[0].fee).toBe(observedFees.networkFeeXor);
    const sells = replay.fills.filter((fill) => fill.side === 'sell');
    expect(sells.length).toBeGreaterThan(0);
    expect(sells.every((fill) => fill.timestamp > START + 212 * HOUR)).toBe(true);
    expect(Number(replay.returnPercent)).toBeGreaterThan(0);
    expect(Number(replay.maxImpactPercent)).toBeGreaterThan(0);
  });

  it('never exceeds the 2 XOR network-fee budget', () => {
    // A rising staircase keeps a trend rule signalling on almost every bar.
    const prices = Array.from({ length: 600 }, (_value, index) => 1000 + index * 3 + (index % 2) * 40);
    const market = parseQuantArchive(archive(prices)).markets[0];
    const replay = replayQuantCandidate(market, candidate('trend:24/2:2'), 0, prices.length, COSTS);
    expect(replay.trades).toBeLessThanOrEqual(19);
    const fees = replay.fills.reduce((total, fill) => total + Number(fill.fee), 0);
    expect(fees).toBeLessThanOrEqual(2);
  });

  it('rejects ranges outside the archive', () => {
    const market = parseQuantArchive(archive(dislocation(50))).markets[0];
    expect(() => replayQuantCandidate(market, candidate('reversion:24/20/5:2'), 10, 10, COSTS)).toThrow();
    expect(() => replayQuantCandidate(market, candidate('reversion:24/20/5:2'), 0, 51, COSTS)).toThrow();
  });
});

describe('runQuantLoop', () => {
  it('reports progress, gates thin pools and returns deterministic results', async () => {
    const prices = Array.from({ length: 1600 }, (_value, index) =>
      index % 97 >= 80 && index % 97 < 88 ? 690 : index % 97 >= 88 && index % 97 < 96 ? 1120 : 1000
    );
    const parsed = parseQuantArchive(archive(prices, { thin: true }));
    const progress: QuantProgress[] = [];
    const first = await runQuantLoop(parsed, COSTS, { now: 1, onProgress: (item) => progress.push(item) });
    const second = await runQuantLoop(parsed, COSTS, { now: 1 });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.counts.candidates).toBe(672);
    expect(first.markets.find((market) => market.asset.symbol === 'XST')?.status).toBe('thin');
    const pswap = first.markets.find((market) => market.asset.symbol === 'PSWAP')!;
    expect(pswap.folds).toHaveLength(QUANT_FOLDS);
    expect(progress.at(-1)?.phase).toBe('done');
    expect(progress.at(-1)?.completed).toBe(progress.at(-1)?.total);
    for (let index = 1; index < progress.length; index++)
      expect(progress[index].completed).toBeGreaterThanOrEqual(progress[index - 1].completed);
  });

  it('selects each fold without reading later hours', async () => {
    const base = Array.from({ length: 1600 }, (_value, index) =>
      index % 61 >= 50 && index % 61 < 56 ? 700 : 1000 + (index % 7) * 5
    );
    const changed = base.map((price, index) => (index >= 1450 ? 1000 + ((index * 37) % 400) : price));
    const a = await runQuantLoop(parseQuantArchive(archive(base)), COSTS, { now: 1 });
    const b = await runQuantLoop(parseQuantArchive(archive(changed)), COSTS, { now: 1 });
    const foldsA = a.markets[0].folds;
    const foldsB = b.markets[0].folds;
    const cutoff = START + 1450 * HOUR;
    foldsA.forEach((fold, index) => {
      // Every fold is chosen from hours before its start; only folds ending before the change must match fully.
      expect(foldsB[index].candidateId).toBe(fold.startAt <= cutoff ? fold.candidateId : foldsB[index].candidateId);
      if (fold.endAt < cutoff) expect(foldsB[index].returnPercent).toBe(fold.returnPercent);
    });
  });
});

describe('exact signals', () => {
  it('match the live rule engine bar by bar on real PSWAP history', async () => {
    const raw = JSON.parse(
      await readFile(
        path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'),
        'utf8'
      )
    );
    const market = parseQuantArchive(raw).markets.find((item) => item.asset.symbol === 'PSWAP')!;
    const prefix = prefixSums(market);
    const candles = market.closeUnits.map((close, index) => {
      const digits = close.toString().padStart(37, '0');
      return { timestamp: market.timestamps[index], close: `${digits.slice(0, -36)}.${digits.slice(-36)}` };
    });
    const sample: QuantCandidate[] = [
      candidate('reversion:96/20/10:2'),
      candidate('guarded:48/15/0/-30:3'),
      candidate('shock:3/18/24/0:2'),
      candidate('breakout:48/24:2'),
    ];
    for (const item of sample) {
      const needed = requiredRuleCandles(item.rules);
      for (let index = 1200; index < 1700; index++) {
        const evaluation = evaluateStrategyRules(item.rules, candles.slice(Math.max(0, index - needed + 1), index + 1));
        const expected = !evaluation.ready ? null : evaluation.exit ? 'sell' : evaluation.entry ? 'buy' : null;
        expect(quantSignalAt(market, prefix, item, index), `${item.id} @ ${index}`).toBe(expected);
      }
    }
  });
});

describe('real archive regression', () => {
  it('finds walk-forward survivors only in deep pools, after real fees', async () => {
    const raw = JSON.parse(
      await readFile(
        path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'),
        'utf8'
      )
    );
    const result = await runQuantLoop(parseQuantArchive(raw), COSTS, { now: Date.UTC(2026, 9, 2) });
    const status = Object.fromEntries(result.markets.map((market) => [market.asset.symbol, market.status]));
    expect(status).toMatchObject({ ETH: 'thin', XSTUSD: 'thin', XST: 'thin' });
    const deployable = result.markets.filter((market) => market.status === 'deploy');
    expect(deployable.length).toBeGreaterThan(0);
    for (const market of deployable) {
      expect(Number(market.walkForward!.returnPercent)).toBeGreaterThan(0);
      expect(market.walkForward!.trades).toBeGreaterThanOrEqual(6);
      expect(market.final).not.toBeNull();
      // Walk-forward evidence is blind: it starts after the initial training half.
      expect(market.walkForward!.startAt).toBeGreaterThan(result.archive.startAt);
    }
    expect(result.counts.killed + result.counts.robust).toBe(result.counts.candidates * result.counts.markets);
  });
});

describe('quantCadence', () => {
  const fill = (hour: number, side: 'buy' | 'sell') => ({
    timestamp: START + hour * HOUR,
    side,
    input: '1',
    output: '1',
    fee: '0.1',
    price: '1',
    pnlPercent: '0.00',
    impactPercent: '1.00',
  });

  it('counts episodes from flat entries and measures each holding span', () => {
    const fills = [
      fill(10, 'buy'),
      fill(11, 'buy'),
      fill(40, 'sell'),
      fill(200, 'buy'),
      fill(209, 'sell'),
      fill(210, 'sell'),
    ];
    const cadence = quantCadence(fills, START, START + 20 * 24 * HOUR);
    expect(cadence).toEqual({
      episodes: 2,
      daysPerEpisode: 10,
      holdHours: { min: 10, max: 30 },
      lastEntryAt: START + 200 * HOUR,
    });
  });

  it('reports no cadence for markets that never traded', () => {
    expect(quantCadence([], START, START + 10 * HOUR)).toEqual({
      episodes: 0,
      daysPerEpisode: null,
      holdHours: null,
      lastEntryAt: null,
    });
  });
});

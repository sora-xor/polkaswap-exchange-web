// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  QUANT_FOLDS,
  chainQuantReplays,
  createQuantScreenCache,
  generateQuantCandidates,
  parseQuantArchive,
  quantScreenCosts,
  replayQuantCandidate,
  runQuantLoop,
  type QuantCosts,
  type QuantMarket,
} from '@/features/bot-trading/quant-loop';
import {
  STUDIO_AMOUNTS,
  STUDIO_GRID_BUDGET,
  STUDIO_OUTCOMES,
  STUDIO_RECIPES,
  decodeStudioLink,
  defaultStudioState,
  encodeStudioLink,
  normalizeStudioState,
  snapToGrid,
  studioCandidate,
  studioCandidateId,
  studioGrid,
  studioGridValues,
  studioLandscape,
  studioPeriods,
  studioRecipe,
  studioReplay,
  studioSeries,
  studioStateFromCandidateId,
  createStudioEngine,
  type StudioState,
} from '@/features/bot-trading/quant-studio';
import { parseStrategyRules, requiredRuleCandles } from '@/features/bot-trading/strategy-rules';
import observedFees from '../../../fixtures/bot-trading/mainnetFees20260914.json';

const COSTS: QuantCosts = { networkFeeXor: observedFees.networkFeeXor, swapFeePercent: '0.6', slippagePercent: '0.5' };

let markets: QuantMarket[] = [];
let archiveRaw: unknown;
const market = (symbol: string) => markets.find((item) => item.asset.symbol === symbol)!;

beforeAll(async () => {
  const raw = JSON.parse(
    await readFile(
      path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'),
      'utf8'
    )
  );
  archiveRaw = raw;
  markets = parseQuantArchive(raw).markets;
});

/** Every parameter swept at its extremes and through its grid, others at defaults. */
function sweepStates(recipeId: string): StudioState[] {
  const recipe = studioRecipe(recipeId);
  const states: StudioState[] = [defaultStudioState(recipe.id)];
  const low: Record<string, number> = {};
  const high: Record<string, number> = {};
  for (const param of recipe.params) {
    low[param.key] = param.values[0];
    high[param.key] = param.values[param.values.length - 1];
    for (const value of param.values)
      states.push({ recipe: recipe.id, values: { ...recipe.defaults, [param.key]: value } });
  }
  states.push({ recipe: recipe.id, values: low }, { recipe: recipe.id, values: high });
  return states;
}

describe('studio recipes', () => {
  it('declare ascending grids, known axes and lines, and defaults on the grid', () => {
    expect(new Set(STUDIO_RECIPES.map((recipe) => recipe.id)).size).toBe(STUDIO_RECIPES.length);
    for (const recipe of STUDIO_RECIPES) {
      const keys = recipe.params.map((param) => param.key);
      expect(keys).toContain('amount');
      expect(recipe.params.find((param) => param.key === 'amount')!.values).toEqual(STUDIO_AMOUNTS);
      for (const param of recipe.params) {
        expect(
          [...param.values].sort((a, b) => a - b),
          `${recipe.id}.${param.key}`
        ).toEqual([...param.values]);
        expect(param.values, `${recipe.id}.${param.key} default`).toContain(recipe.defaults[param.key]);
      }
      expect(keys).toEqual(expect.arrayContaining([...recipe.axes]));
      for (const line of [recipe.buyLine, recipe.sellLine]) if (line) expect(keys).toContain(line.param);
    }
  });

  it('build canonical live rules across every parameter range', () => {
    for (const recipe of STUDIO_RECIPES) {
      for (const state of sweepStates(recipe.id)) {
        const candidate = studioCandidate(state);
        expect(parseStrategyRules(candidate.rules), candidate.id).toEqual(candidate.rules);
        expect(requiredRuleCandles(candidate.rules)).toBeGreaterThan(0);
        expect(requiredRuleCandles(candidate.rules)).toBeLessThanOrEqual(202);
      }
    }
  });

  it('snap off-grid values, drop unknown keys and reject unknown recipes', () => {
    const state = normalizeStudioState({ recipe: 'dip', values: { window: 50, buy: 16.4, extra: 9, amount: 7 } });
    expect(state.values).toEqual({ window: 48, buy: 17.5, sell: 10, amount: 3 });
    expect(snapToGrid({ key: 'x', unit: 'percent', values: [10, 20] }, 15)).toBe(10);
    expect(() => normalizeStudioState({ recipe: 'martingale' })).toThrow('bots.errors.config');
    expect(studioCandidateId(defaultStudioState('dip'))).toBe('studio:dip:48/15/10:3');
  });

  it('open every ready-made Quant Loop candidate with exactly the same rules', () => {
    for (const candidate of generateQuantCandidates()) {
      const state = studioStateFromCandidateId(candidate.id);
      expect(state, candidate.id).not.toBeNull();
      const studio = studioCandidate(state!);
      expect(studio.rules, candidate.id).toEqual(candidate.rules);
      expect(studio.amount).toBe(candidate.amount);
    }
    expect(studioStateFromCandidateId('reversion:50/15/10:3')).toBeNull();
    expect(studioStateFromCandidateId('martingale:1/2:3')).toBeNull();
  });

  it('round-trip bounded deep links and refuse malformed ones', () => {
    const state = normalizeStudioState({ recipe: 'rare-drop', values: { buy: 12.5, percentile: 5 } });
    const link = encodeStudioLink('PSWAP', state);
    expect(link).toBe('PSWAP~rare-drop~48_12.5_10_168_5~3');
    expect(decodeStudioLink(link)).toEqual({ market: 'PSWAP', state });
    expect(decodeStudioLink('PSWAP~rare-drop~48_13_10_168_5~3')).toBeNull();
    expect(decodeStudioLink('PSWAP~dip~48_15~3')).toBeNull();
    expect(decodeStudioLink('<script>~dip~48_15_10~3')).toBeNull();
    expect(decodeStudioLink(`PSWAP~dip~${'1'.repeat(200)}~3`)).toBeNull();
    expect(decodeStudioLink(42)).toBeNull();
  });
});

describe('studio periods', () => {
  it('split the second half exactly like the Quant Loop folds', async () => {
    const pswap = market('PSWAP');
    const periods = studioPeriods(pswap);
    expect(periods.first).toHaveLength(QUANT_FOLDS);
    expect(periods.second).toHaveLength(QUANT_FOLDS);
    expect(periods.first[0][0]).toBe(0);
    expect(periods.first.at(-1)![1]).toBe(periods.split);
    expect(periods.second[0][0]).toBe(periods.split);
    expect(periods.second.at(-1)![1]).toBe(pswap.closes.length);
    const raw = JSON.parse(
      await readFile(
        path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'),
        'utf8'
      )
    );
    const loop = await runQuantLoop(parseQuantArchive(raw), COSTS, { now: Date.UTC(2026, 9, 2) });
    const folds = loop.markets.find((item) => item.asset.symbol === 'PSWAP')!.folds;
    expect(periods.second.map(([from, to]) => [pswap.timestamps[from], pswap.timestamps[to - 1]])).toEqual(
      folds.map((fold) => [fold.startAt, fold.endAt])
    );
  });
});

describe('studioReplay', () => {
  it('chains exact replays of each period and reports both halves', () => {
    const pswap = market('PSWAP');
    const state = defaultStudioState('dip');
    const replay = studioReplay(pswap, state, COSTS);
    const periods = studioPeriods(pswap);
    const manual = periods.second.map(([from, to]) =>
      replayQuantCandidate(pswap, studioCandidate(state), from, to, COSTS)
    );
    const chained = chainQuantReplays(manual);
    expect(replay.second.returnPercent).toBe(chained.returnPercent);
    expect(replay.second.drawdownPercent).toBe(chained.drawdownPercent);
    expect(replay.second.trades).toBe(manual.reduce((total, item) => total + item.trades, 0));
    expect(replay.second.fills).toEqual(manual.flatMap((item) => item.fills));
    expect(replay.splitAt).toBe(pswap.timestamps[periods.split]);
    expect(replay.second.startAt).toBe(replay.splitAt);
    expect(replay.first.endAt).toBe(pswap.timestamps[periods.split - 1]);
    expect(replay.first.holdPercent).toMatch(/^-?\d+\.\d{2}$/);
    expect(replay.cadence.episodes).toBeGreaterThan(0);
    expect(Number(replay.latestClose)).toBeGreaterThan(0);
    expect(studioReplay(pswap, state, COSTS)).toEqual(replay);
  });

  it('agrees with the Tier 1 landscape to well under a percentage point', () => {
    const cache = createQuantScreenCache();
    const costs = quantScreenCosts(COSTS);
    for (const symbol of ['PSWAP', 'DAI']) {
      for (const id of ['dip', 'oversold', 'rare-drop', 'rebound'] as const) {
        const state = defaultStudioState(id);
        const landscape = studioLandscape(market(symbol), state, costs, cache);
        const cell =
          landscape.ys.indexOf(state.values[landscape.yKey]) * landscape.xs.length +
          landscape.xs.indexOf(state.values[landscape.xKey]);
        const exact = studioReplay(market(symbol), state, COSTS);
        expect(
          Math.abs(landscape.first[cell] * 100 - Number(exact.first.returnPercent)),
          `${symbol} ${id}`
        ).toBeLessThan(0.5);
        expect(
          Math.abs(landscape.second[cell] * 100 - Number(exact.second.returnPercent)),
          `${symbol} ${id}`
        ).toBeLessThan(0.5);
      }
    }
  });
});

describe('studio views', () => {
  it('sweep a landscape over the recipe axes with every other value fixed', () => {
    const state = normalizeStudioState({ recipe: 'drop', values: { sell: 5 } });
    const landscape = studioLandscape(market('DAI'), state, quantScreenCosts(COSTS), createQuantScreenCache());
    expect([landscape.xKey, landscape.yKey]).toEqual(['hours', 'drop']);
    expect(landscape.first).toHaveLength(landscape.xs.length * landscape.ys.length);
    expect([...landscape.first, ...landscape.second, ...landscape.drop].every(Number.isFinite)).toBe(true);
  });

  it('pack a thinned grid within budget that keeps the current values', () => {
    for (const recipe of STUDIO_RECIPES) {
      const state = defaultStudioState(recipe.id);
      const lists = studioGridValues(state);
      const rows = lists.reduce((total, list) => total * list.length, 1);
      expect(rows, recipe.id).toBeLessThanOrEqual(STUDIO_GRID_BUDGET);
      recipe.params.forEach((param, index) => expect(lists[index]).toContain(state.values[param.key]));
    }
    const grid = studioGrid(
      market('PSWAP'),
      defaultStudioState('trend'),
      quantScreenCosts(COSTS),
      createQuantScreenCache()
    );
    expect(grid.columns).toEqual(['window', 'lead', 'exit', 'amount', ...STUDIO_OUTCOMES]);
    expect(grid.data).toHaveLength(grid.rows * grid.columns.length);
    expect([...grid.data].every(Number.isFinite)).toBe(true);
  });

  it('return chart series with shared panels and a relative trace for both halves', () => {
    const costs = quantScreenCosts(COSTS);
    const cache = createQuantScreenCache();
    const dip = studioSeries(market('PSWAP'), defaultStudioState('dip'), costs, cache);
    expect(dip.shared).toBe(true);
    expect(dip.sell).toBeNull();
    expect(dip.buy).toHaveLength(dip.price.length);
    expect(dip.trace.value[0]).toBe(1);
    expect(dip.trace.value[dip.split]).toBe(1);
    const drop = studioSeries(market('PSWAP'), defaultStudioState('drop'), costs, cache);
    expect(drop.shared).toBe(false);
    expect(drop.sell).toHaveLength(drop.price.length);
    const breakout = studioSeries(market('PSWAP'), defaultStudioState('breakout'), costs, cache);
    expect(breakout.buy).toBeNull();
    expect(breakout.sell).toBeNull();
  });
});

describe('createStudioEngine', () => {
  const job = (
    type: 'landscape' | 'series' | 'replay' | 'probe',
    market = 'PSWAP',
    state = defaultStudioState('dip')
  ) => ({ type, market, state, costs: COSTS }) as const;

  it('describes the archive and which markets are deep enough to study', () => {
    const engine = createStudioEngine(parseQuantArchive(archiveRaw));
    const tradable = Object.fromEntries(engine.info.markets.map((item) => [item.symbol, item.tradable]));
    expect(tradable).toMatchObject({ VAL: true, PSWAP: true, DAI: true, ETH: false, XST: false, XSTUSD: false });
    const pswap = market('PSWAP');
    expect(engine.info.splitAt).toBe(pswap.timestamps[studioPeriods(pswap).split]);
    expect(engine.info.hours).toBe(pswap.closes.length);
  });

  it('answers each job type, memoises landscapes and probes, and rejects thin markets and bad costs', () => {
    const engine = createStudioEngine(parseQuantArchive(archiveRaw));
    const landscape = engine.run(job('landscape'));
    expect(landscape.type).toBe('landscape');
    // Moving along the landscape axes reuses the same slice.
    const moved = normalizeStudioState({ recipe: 'dip', values: { window: 96, buy: 25 } });
    expect(engine.run(job('landscape', 'PSWAP', moved))).toBe(landscape);
    expect(engine.run(job('series')).type).toBe('series');
    const replay = engine.run(job('replay'));
    expect(replay.type === 'replay' && replay.replay.candidate.id).toBe('studio:dip:48/15/10:3');
    const probe = engine.run(job('probe'));
    expect(engine.run(job('probe'))).toBe(probe);
    expect(() => engine.run(job('replay', 'ETH'))).toThrow('bots.errors.config');
    expect(() => engine.run(job('replay', 'NOPE'))).toThrow('bots.errors.config');
    expect(() => engine.run({ ...job('replay'), costs: { ...COSTS, swapFeePercent: '100' } })).toThrow(
      'bots.errors.config'
    );
    expect(() => engine.run({ ...job('replay'), costs: { ...COSTS, networkFeeXor: '-1' } })).toThrow(
      'bots.errors.config'
    );
  });

  it('builds grids in steps so other jobs can run in between, then serves them from memory', () => {
    const engine = createStudioEngine(parseQuantArchive(archiveRaw));
    const state = defaultStudioState('trend');
    const builder = engine.grid({ type: 'grid', market: 'DAI', state, costs: COSTS });
    let steps = 0;
    let grid = builder.step(100);
    while (!grid) {
      steps++;
      expect(engine.run(job('probe', 'DAI')).type).toBe('probe');
      grid = builder.step(100);
    }
    expect(steps).toBeGreaterThan(2);
    const direct = studioGrid(market('DAI'), state, quantScreenCosts(COSTS), createQuantScreenCache());
    expect(grid.columns).toEqual(direct.columns);
    expect(Array.from(grid.data)).toEqual(Array.from(direct.data));
    const again = engine.grid({ type: 'grid', market: 'DAI', state, costs: COSTS });
    expect(again.step(1)).toBe(grid);
  });
});

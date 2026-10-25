/**
 * Strategy Studio: interactive rule research over the bundled archive.
 *
 * A recipe is a rule strategy with a few named parameters, each on a fixed grid. The studio
 * splits the archive at the Quant Loop's blind start: users tune on the first half, and the
 * second half shows whether the rules held up on hours the tuning did not have to see.
 *
 * Two arithmetic tiers, as in the Quant Loop:
 * - Landscapes, parameter grids and drag previews use Tier 1 Float64 screening. Those values
 *   only position marks and colours; they never become text, a bot amount or a transaction.
 * - Every number shown as text comes from `studioReplay`, the exact Tier 2 replay with
 *   constant-product fills, codec fees and the rule engine's integer comparisons.
 *
 * Every recipe builds rules the live parser accepts, so any studio strategy can run unchanged
 * in a paper bot. This module is pure and wallet-free; workers can import it.
 */
import { parseStrategyRules, type RuleCondition, type StrategyRules } from './strategy-rules';
import {
  QUANT_FOLDS,
  QUANT_MIN_MEDIAN_XOR_DEPTH,
  QUANT_TRAIN_PERCENT,
  chainQuantReplays,
  createQuantScreenCache,
  quantScreenCosts,
  quantCadence,
  quantPriceChange,
  replayQuantCandidate,
  screenQuantReplay,
  screenQuantSeries,
  screenQuantSignals,
  type QuantArchive,
  type QuantCadence,
  type QuantCandidate,
  type QuantCosts,
  type QuantEquityPoint,
  type QuantFill,
  type QuantMarket,
  type QuantScreenCache,
  type QuantScreenCosts,
} from './quant-loop';

export type StudioRecipeId =
  | 'dip'
  | 'steady-dip'
  | 'drop'
  | 'oversold'
  | 'peak'
  | 'rare-drop'
  | 'rebound'
  | 'range'
  | 'elastic'
  | 'trend'
  | 'breakout';

/** Display unit of a parameter: hours, percent, an index level (0-100) or a percentile rank. */
export type StudioUnit = 'hours' | 'percent' | 'level' | 'percentile' | 'xor';

export interface StudioParam {
  key: string;
  unit: StudioUnit;
  /** Ascending grid; every value yields rules the live parser accepts. */
  values: readonly number[];
}

/**
 * A draggable chart line: the indicator it is drawn against and how the parameter maps to the
 * indicator's threshold (`threshold = sign × value`).
 */
export interface StudioLine {
  param: string;
  sign: 1 | -1;
  indicator: (values: StudioValues) => RuleCondition;
}

export interface StudioRecipe {
  id: StudioRecipeId;
  /** Buying dips or following moves; used to group the picker. */
  group: 'dip' | 'move';
  /** True when the Quant Loop's ready-made search also tests this family. */
  readyMade: boolean;
  params: readonly StudioParam[];
  defaults: Readonly<StudioValues>;
  /** Landscape axes, horizontal then depth. */
  axes: readonly [string, string];
  buyLine: StudioLine | null;
  sellLine: StudioLine | null;
  build: (values: StudioValues) => StrategyRules;
}

export type StudioValues = Record<string, number>;

/** The complete, serialisable choice the studio replays. */
export interface StudioState {
  recipe: StudioRecipeId;
  values: StudioValues;
}

/** Order sizes in XOR; the research capital stays 10 XOR with a 2 XOR fee reserve. */
export const STUDIO_AMOUNTS = [1, 2, 3] as const;
/** Upper bound on simulated rows for the parallel view; coarser grids keep it responsive. */
export const STUDIO_GRID_BUDGET = 4_000;

const AMOUNT: StudioParam = { key: 'amount', unit: 'xor', values: STUDIO_AMOUNTS };
const DIP_WINDOWS = [12, 18, 24, 36, 48, 60, 72, 96, 120, 144, 168, 192];
const DIP_DEPTHS = [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50];
const RECOVERY = [-10, -5, -2.5, 0, 2.5, 5, 7.5, 10, 15, 20];
const EXIT_WINDOWS = [24, 48, 96];
const EXIT_LEVELS = [-5, 0, 5, 10, 15];

const num = (value: number) => String(value);
const dev = (window: number, direction: 'above' | 'below', threshold: number): RuleCondition => ({
  kind: 'deviation',
  window,
  direction,
  threshold: num(threshold),
});
const leaf = (
  kind: 'momentum' | 'rsi' | 'drawdown' | 'efficiency' | 'restoring',
  window: number,
  direction: 'above' | 'below',
  threshold: number
): RuleCondition => ({ kind, window, direction, threshold: num(threshold) });
const all = (conditions: RuleCondition[]) => ({ operator: 'all' as const, conditions });
const rules = (entry: RuleCondition[], exit: RuleCondition[], exitOperator: 'all' | 'any' = 'all'): StrategyRules => ({
  version: 1,
  entry: all(entry),
  exit: { operator: exitOperator, conditions: exit },
});

/** Mean-reversion lines shared by every dip recipe that sells on the same average. */
const dipBuy: StudioLine = { param: 'buy', sign: -1, indicator: (v) => dev(v.window, 'below', 0) };
const dipSell: StudioLine = { param: 'sell', sign: 1, indicator: (v) => dev(v.window, 'above', 0) };
const averageSell: StudioLine = { param: 'sell', sign: 1, indicator: (v) => dev(v.average, 'above', 0) };

/**
 * Recipes in picker order. The first three and the last two are the Quant Loop's ready-made
 * families on finer grids; the rest are newer ideas built from the same live conditions.
 */
export const STUDIO_RECIPES: readonly StudioRecipe[] = [
  {
    id: 'dip',
    group: 'dip',
    readyMade: true,
    params: [
      { key: 'window', unit: 'hours', values: DIP_WINDOWS },
      { key: 'buy', unit: 'percent', values: DIP_DEPTHS },
      { key: 'sell', unit: 'percent', values: RECOVERY },
      AMOUNT,
    ],
    defaults: { window: 48, buy: 15, sell: 10, amount: 3 },
    axes: ['window', 'buy'],
    buyLine: dipBuy,
    sellLine: dipSell,
    build: (v) => rules([dev(v.window, 'below', -v.buy)], [dev(v.window, 'above', v.sell)]),
  },
  {
    id: 'steady-dip',
    group: 'dip',
    readyMade: true,
    params: [
      { key: 'window', unit: 'hours', values: DIP_WINDOWS },
      { key: 'buy', unit: 'percent', values: DIP_DEPTHS },
      { key: 'sell', unit: 'percent', values: RECOVERY },
      { key: 'guard', unit: 'percent', values: [5, 10, 15, 20, 30, 40, 50] },
      AMOUNT,
    ],
    defaults: { window: 96, buy: 20, sell: 10, guard: 30, amount: 2 },
    axes: ['window', 'buy'],
    buyLine: dipBuy,
    sellLine: dipSell,
    build: (v) =>
      rules(
        [dev(v.window, 'below', -v.buy), leaf('momentum', 168, 'above', -v.guard)],
        [dev(v.window, 'above', v.sell)]
      ),
  },
  {
    id: 'drop',
    group: 'dip',
    readyMade: true,
    params: [
      { key: 'hours', unit: 'hours', values: [2, 3, 4, 6, 8, 12, 18, 24] },
      { key: 'drop', unit: 'percent', values: [8, 10, 12, 15, 18, 21, 25, 30, 35, 40, 50] },
      { key: 'average', unit: 'hours', values: EXIT_WINDOWS },
      { key: 'sell', unit: 'percent', values: EXIT_LEVELS },
      AMOUNT,
    ],
    defaults: { hours: 3, drop: 18, average: 24, sell: 0, amount: 2 },
    axes: ['hours', 'drop'],
    buyLine: { param: 'drop', sign: -1, indicator: (v) => leaf('momentum', v.hours, 'below', 0) },
    sellLine: averageSell,
    build: (v) => rules([leaf('momentum', v.hours, 'below', -v.drop)], [dev(v.average, 'above', v.sell)]),
  },
  {
    id: 'oversold',
    group: 'dip',
    readyMade: false,
    params: [
      { key: 'window', unit: 'hours', values: [3, 4, 6, 8, 12, 16, 24, 36, 48] },
      { key: 'level', unit: 'level', values: [5, 10, 15, 20, 25, 30, 35, 40] },
      { key: 'average', unit: 'hours', values: EXIT_WINDOWS },
      { key: 'sell', unit: 'percent', values: EXIT_LEVELS },
      AMOUNT,
    ],
    defaults: { window: 12, level: 20, average: 48, sell: 5, amount: 2 },
    axes: ['window', 'level'],
    buyLine: { param: 'level', sign: 1, indicator: (v) => leaf('rsi', v.window, 'below', 0) },
    sellLine: averageSell,
    build: (v) => rules([leaf('rsi', v.window, 'below', v.level)], [dev(v.average, 'above', v.sell)]),
  },
  {
    id: 'peak',
    group: 'dip',
    readyMade: false,
    params: [
      { key: 'window', unit: 'hours', values: [24, 48, 72, 96, 120, 144, 168, 200] },
      { key: 'fall', unit: 'percent', values: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60] },
      { key: 'average', unit: 'hours', values: EXIT_WINDOWS },
      { key: 'sell', unit: 'percent', values: EXIT_LEVELS },
      AMOUNT,
    ],
    defaults: { window: 96, fall: 30, average: 48, sell: 5, amount: 2 },
    axes: ['window', 'fall'],
    buyLine: { param: 'fall', sign: -1, indicator: (v) => leaf('drawdown', v.window, 'below', 0) },
    sellLine: averageSell,
    build: (v) => rules([leaf('drawdown', v.window, 'below', -v.fall)], [dev(v.average, 'above', v.sell)]),
  },
  {
    id: 'rare-drop',
    group: 'dip',
    readyMade: false,
    params: [
      { key: 'window', unit: 'hours', values: [24, 36, 48, 72, 96, 120, 168] },
      { key: 'buy', unit: 'percent', values: [5, 7.5, 10, 12.5, 15, 20, 25, 30] },
      { key: 'sell', unit: 'percent', values: [0, 5, 10, 15] },
      { key: 'lookback', unit: 'hours', values: [24, 48, 96, 168] },
      { key: 'percentile', unit: 'percentile', values: [1, 2, 5, 10] },
      AMOUNT,
    ],
    defaults: { window: 48, buy: 20, sell: 10, lookback: 168, percentile: 2, amount: 3 },
    axes: ['window', 'buy'],
    buyLine: dipBuy,
    sellLine: dipSell,
    build: (v) =>
      rules(
        [
          { kind: 'return-quantile', window: v.lookback, direction: 'below', percentile: v.percentile },
          dev(v.window, 'below', -v.buy),
        ],
        [dev(v.window, 'above', v.sell)]
      ),
  },
  {
    id: 'rebound',
    group: 'dip',
    readyMade: false,
    params: [
      { key: 'window', unit: 'hours', values: DIP_WINDOWS },
      { key: 'buy', unit: 'percent', values: DIP_DEPTHS },
      { key: 'sell', unit: 'percent', values: [0, 2.5, 5, 7.5, 10, 15, 20] },
      { key: 'jumpHours', unit: 'hours', values: [3, 6, 12, 24] },
      { key: 'jump', unit: 'percent', values: [5, 10, 15, 20, 30] },
      AMOUNT,
    ],
    defaults: { window: 48, buy: 15, sell: 10, jumpHours: 6, jump: 15, amount: 3 },
    axes: ['window', 'buy'],
    buyLine: dipBuy,
    sellLine: dipSell,
    build: (v) =>
      rules(
        [dev(v.window, 'below', -v.buy)],
        [dev(v.window, 'above', v.sell), leaf('momentum', v.jumpHours, 'above', v.jump)],
        'any'
      ),
  },
  {
    id: 'range',
    group: 'dip',
    readyMade: false,
    params: [
      { key: 'window', unit: 'hours', values: DIP_WINDOWS },
      { key: 'buy', unit: 'percent', values: DIP_DEPTHS },
      { key: 'sell', unit: 'percent', values: [-5, 0, 2.5, 5, 7.5, 10, 15] },
      { key: 'filterWindow', unit: 'hours', values: [12, 24, 48, 96] },
      { key: 'choppy', unit: 'level', values: [10, 20, 30, 40, 50, 60] },
      AMOUNT,
    ],
    defaults: { window: 48, buy: 20, sell: 5, filterWindow: 48, choppy: 30, amount: 2 },
    axes: ['window', 'buy'],
    buyLine: dipBuy,
    sellLine: dipSell,
    build: (v) =>
      rules(
        [dev(v.window, 'below', -v.buy), leaf('efficiency', v.filterWindow, 'below', v.choppy)],
        [dev(v.window, 'above', v.sell)]
      ),
  },
  {
    id: 'elastic',
    group: 'dip',
    readyMade: false,
    params: [
      { key: 'window', unit: 'hours', values: DIP_WINDOWS },
      { key: 'buy', unit: 'percent', values: DIP_DEPTHS },
      { key: 'sell', unit: 'percent', values: [-5, 0, 2.5, 5, 7.5, 10, 15] },
      { key: 'filterWindow', unit: 'hours', values: [48, 96, 168] },
      { key: 'pull', unit: 'level', values: [1, 2, 3, 5, 8, 12] },
      AMOUNT,
    ],
    defaults: { window: 48, buy: 20, sell: 5, filterWindow: 48, pull: 2, amount: 2 },
    axes: ['window', 'buy'],
    buyLine: dipBuy,
    sellLine: dipSell,
    build: (v) =>
      rules(
        [dev(v.window, 'below', -v.buy), leaf('restoring', v.filterWindow, 'above', v.pull)],
        [dev(v.window, 'above', v.sell)]
      ),
  },
  {
    id: 'trend',
    group: 'move',
    readyMade: true,
    params: [
      { key: 'window', unit: 'hours', values: [12, 24, 36, 48, 72, 96, 120, 168] },
      { key: 'lead', unit: 'percent', values: [1, 2, 3, 5, 7.5, 10, 15, 20] },
      { key: 'exit', unit: 'percent', values: [0, 2.5, 5, 10] },
      AMOUNT,
    ],
    defaults: { window: 48, lead: 5, exit: 0, amount: 2 },
    axes: ['window', 'lead'],
    buyLine: { param: 'lead', sign: 1, indicator: (v) => dev(v.window, 'above', 0) },
    sellLine: { param: 'exit', sign: -1, indicator: (v) => dev(v.window, 'below', 0) },
    build: (v) => rules([dev(v.window, 'above', v.lead)], [dev(v.window, 'below', -v.exit)]),
  },
  {
    id: 'breakout',
    group: 'move',
    readyMade: true,
    params: [
      { key: 'window', unit: 'hours', values: [12, 24, 36, 48, 72, 96, 120, 144, 168, 200] },
      { key: 'exitWindow', unit: 'hours', values: [6, 12, 24, 48, 96] },
      AMOUNT,
    ],
    defaults: { window: 48, exitWindow: 24, amount: 2 },
    axes: ['window', 'exitWindow'],
    buyLine: null,
    sellLine: null,
    build: (v) =>
      rules(
        [{ kind: 'breakout', window: v.window, direction: 'above' }],
        [{ kind: 'breakout', window: v.exitWindow, direction: 'below' }]
      ),
  },
];

const RECIPES = new Map(STUDIO_RECIPES.map((recipe) => [recipe.id, recipe]));

/** Look up a recipe; unknown identifiers are rejected rather than guessed. */
export function studioRecipe(id: string): StudioRecipe {
  const recipe = RECIPES.get(id as StudioRecipeId);
  if (!recipe) throw new Error('bots.errors.config');
  return recipe;
}

/** The value on a parameter's grid closest to `value`; ties keep the smaller value. */
export function snapToGrid(param: StudioParam, value: number): number {
  let best = param.values[0];
  for (const candidate of param.values)
    if (Math.abs(candidate - value) < Math.abs(best - value) - 1e-9) best = candidate;
  return best;
}

/**
 * Canonical state for a recipe: missing parameters take defaults, others snap to their grid,
 * and unknown keys are dropped. The result always builds valid live rules.
 */
export function normalizeStudioState(state: { recipe: string; values?: Record<string, unknown> }): StudioState {
  const recipe = studioRecipe(state.recipe);
  const values: StudioValues = {};
  for (const param of recipe.params) {
    const raw = state.values?.[param.key];
    values[param.key] =
      typeof raw === 'number' && Number.isFinite(raw) ? snapToGrid(param, raw) : recipe.defaults[param.key];
  }
  return { recipe: recipe.id, values };
}

/** Default state for a recipe. */
export function defaultStudioState(id: StudioRecipeId = 'dip'): StudioState {
  return normalizeStudioState({ recipe: id });
}

/** Stable identifier from the recipe and its parameter values in declaration order. */
export function studioCandidateId(state: StudioState): string {
  const recipe = studioRecipe(state.recipe);
  const keys = recipe.params.filter((param) => param.key !== 'amount').map((param) => num(state.values[param.key]));
  return `studio:${recipe.id}:${keys.join('/')}:${num(state.values.amount)}`;
}

/** Build the exact candidate for a state; its rules always pass the live parser. */
export function studioCandidate(input: StudioState): QuantCandidate {
  const state = normalizeStudioState(input);
  const recipe = studioRecipe(state.recipe);
  return {
    id: studioCandidateId(state),
    family: 'reversion',
    amount: num(state.values.amount),
    rules: parseStrategyRules(recipe.build(state.values)),
  };
}

/** First hour of the second half: the same split as the Quant Loop's first blind fold. */
export function studioSplit(market: QuantMarket): number {
  return Math.floor((market.closes.length * QUANT_TRAIN_PERCENT) / 100);
}

/** Consecutive `[from, to)` bar ranges; each restarts from the research capital. */
export type StudioPeriods = [number, number][];

/**
 * Each half is tested as four consecutive periods that restart from the 10 XOR capital and
 * its 2 XOR fee reserve, then compounded. The second half's periods are exactly the Quant
 * Loop's walk-forward folds, so a studio result reads like a ready-made bot's test result.
 * One long run would let the fee reserve, not the rules, decide the outcome: it allows at
 * most 19 trades.
 */
export function studioPeriods(market: QuantMarket): { split: number; first: StudioPeriods; second: StudioPeriods } {
  const hours = market.closes.length;
  const split = studioSplit(market);
  const periods = (from: number, to: number): StudioPeriods => {
    const size = Math.ceil((to - from) / QUANT_FOLDS);
    const list: StudioPeriods = [];
    for (let start = from; start < to; start += size) list.push([start, Math.min(to, start + size)]);
    return list;
  };
  return { split, first: periods(0, split), second: periods(split, hours) };
}

/* ------------------------------------------------------------------------------------------------
 * Tier 1 views: positions and colours only
 * ---------------------------------------------------------------------------------------------- */

/** Both halves of one Tier 1 screen; fractional returns and drops, for drawing only. */
interface ScreenHalves {
  first: number;
  second: number;
  drop: number;
  trades: number;
  holding: number;
}

/** Chain Tier 1 screens of consecutive periods; the optional trace receives relative values. */
function screenPeriods(
  market: QuantMarket,
  signals: Int8Array,
  amount: number,
  periods: StudioPeriods,
  costs: QuantScreenCosts,
  trace?: { buys: number[]; sells: number[]; value: Float64Array }
) {
  const chained = { multiplier: 1, peak: 1, mdd: 0 };
  let trades = 0;
  let held = 0;
  let hours = 0;
  for (const [from, to] of periods) {
    const start = chained.multiplier;
    const values = trace ? new Float64Array(to - from) : undefined;
    const result = screenQuantReplay(
      market,
      signals,
      amount,
      from,
      to,
      costs,
      trace && values ? { buys: trace.buys, sells: trace.sells, value: values } : undefined,
      chained
    );
    if (trace && values)
      values.forEach((value, index) => (trace.value[from + index] = (start * value) / costs.capital));
    trades += result.trades;
    held += result.holding * (to - from);
    hours += to - from;
  }
  return { ret: chained.multiplier - 1, mdd: chained.mdd, trades, holding: hours ? held / hours : 0 };
}

function screenHalves(
  market: QuantMarket,
  candidate: QuantCandidate,
  costs: QuantScreenCosts,
  cache: QuantScreenCache
): ScreenHalves {
  const signals = screenQuantSignals(market, candidate, cache);
  const amount = Number(candidate.amount);
  const { first: firstPeriods, second: secondPeriods } = studioPeriods(market);
  const first = screenPeriods(market, signals, amount, firstPeriods, costs);
  const second = screenPeriods(market, signals, amount, secondPeriods, costs);
  const hours = market.closes.length;
  const split = studioSplit(market);
  return {
    first: first.ret,
    second: second.ret,
    drop: Math.max(first.mdd, second.mdd),
    trades: first.trades + second.trades,
    holding: (first.holding * split + second.holding * (hours - split)) / hours,
  };
}

/**
 * A two-parameter slice of a recipe with every other parameter fixed: one cell per pair of
 * axis values, row-major by depth (`y * xs.length + x`). Values are fractions for drawing.
 */
export interface StudioLandscape {
  recipe: StudioRecipeId;
  xKey: string;
  yKey: string;
  xs: number[];
  ys: number[];
  first: Float32Array;
  second: Float32Array;
  drop: Float32Array;
  trades: Uint16Array;
}

/** Sweep the recipe's landscape axes around the current state with Tier 1 screens. */
export function studioLandscape(
  market: QuantMarket,
  input: StudioState,
  costs: QuantScreenCosts,
  cache: QuantScreenCache
): StudioLandscape {
  const state = normalizeStudioState(input);
  const recipe = studioRecipe(state.recipe);
  const [xKey, yKey] = recipe.axes;
  const xs = [...recipe.params.find((param) => param.key === xKey)!.values];
  const ys = [...recipe.params.find((param) => param.key === yKey)!.values];
  const size = xs.length * ys.length;
  const landscape: StudioLandscape = {
    recipe: recipe.id,
    xKey,
    yKey,
    xs,
    ys,
    first: new Float32Array(size),
    second: new Float32Array(size),
    drop: new Float32Array(size),
    trades: new Uint16Array(size),
  };
  ys.forEach((y, row) =>
    xs.forEach((x, column) => {
      const cell = row * xs.length + column;
      const result = screenHalves(
        market,
        studioCandidate({ recipe: recipe.id, values: { ...state.values, [xKey]: x, [yKey]: y } }),
        costs,
        cache
      );
      landscape.first[cell] = result.first;
      landscape.second[cell] = result.second;
      landscape.drop[cell] = result.drop;
      landscape.trades[cell] = Math.min(65_535, result.trades);
    })
  );
  return landscape;
}

/**
 * The parameter grid used by the parallel view. When the full product exceeds `budget`, the
 * longest list is thinned to every other value (keeping the current value) until it fits.
 */
export function studioGridValues(input: StudioState, budget = STUDIO_GRID_BUDGET): number[][] {
  const state = normalizeStudioState(input);
  const recipe = studioRecipe(state.recipe);
  const lists = recipe.params.map((param) => [...param.values]);
  const product = () => lists.reduce((total, list) => total * list.length, 1);
  while (product() > budget) {
    let longest = 0;
    lists.forEach((list, index) => {
      if (list.length > lists[longest].length) longest = index;
    });
    if (lists[longest].length <= 2) break;
    const current = state.values[recipe.params[longest].key];
    lists[longest] = lists[longest].filter((value, index) => index % 2 === 0 || value === current);
  }
  return lists;
}

/**
 * Every combination of a (possibly thinned) recipe grid, packed for transfer: `columns` lists
 * the parameter keys followed by first, second, maxDrop, holding and trades; `data` holds the
 * rows back to back. Outcome values are Tier 1 fractions for positioning lines.
 */
export interface StudioGrid {
  recipe: StudioRecipeId;
  columns: string[];
  rows: number;
  data: Float32Array;
}

/** Result columns; named so they never collide with a recipe parameter such as `drop`. */
export const STUDIO_OUTCOMES = ['first', 'second', 'maxDrop', 'holding', 'trades'] as const;

/** Incremental grid builder: each `step` simulates up to `count` rows and returns the grid when done. */
export interface StudioGridBuilder {
  rows: number;
  step(count: number): StudioGrid | null;
}

export function studioGridBuilder(
  market: QuantMarket,
  input: StudioState,
  costs: QuantScreenCosts,
  cache: QuantScreenCache,
  budget = STUDIO_GRID_BUDGET
): StudioGridBuilder {
  const state = normalizeStudioState(input);
  const recipe = studioRecipe(state.recipe);
  const lists = studioGridValues(state, budget);
  const keys = recipe.params.map((param) => param.key);
  const columns = [...keys, ...STUDIO_OUTCOMES];
  const rows = lists.reduce((total, list) => total * list.length, 1);
  const data = new Float32Array(rows * columns.length);
  const indices = new Array<number>(lists.length).fill(0);
  let row = 0;
  return {
    rows,
    step(count: number): StudioGrid | null {
      const stop = Math.min(rows, row + Math.max(1, count));
      for (; row < stop; row++) {
        const values: StudioValues = {};
        keys.forEach((key, index) => (values[key] = lists[index][indices[index]]));
        const result = screenHalves(market, studioCandidate({ recipe: recipe.id, values }), costs, cache);
        const offset = row * columns.length;
        keys.forEach((key, index) => (data[offset + index] = values[key]));
        data.set([result.first, result.second, result.drop, result.holding, result.trades], offset + keys.length);
        // Advance the mixed-radix counter, last parameter fastest.
        for (let index = lists.length - 1; index >= 0; index--) {
          indices[index]++;
          if (indices[index] < lists[index].length) break;
          indices[index] = 0;
        }
      }
      return row >= rows ? { recipe: recipe.id, columns, rows, data } : null;
    },
  };
}

export function studioGrid(
  market: QuantMarket,
  input: StudioState,
  costs: QuantScreenCosts,
  cache: QuantScreenCache,
  budget = STUDIO_GRID_BUDGET
): StudioGrid {
  const builder = studioGridBuilder(market, input, costs, cache, budget);
  let grid: StudioGrid | null = null;
  while (!grid) grid = builder.step(builder.rows);
  return grid;
}

/**
 * Chart series for a state: closes plus the buy and sell indicators (NaN while warming up)
 * and a Tier 1 trace of both halves. The trace value is relative to the starting capital
 * (1 at the start of each half) over the chained periods, matching the exact replays, so it
 * previews them while a replay is pending.
 */
export interface StudioSeries {
  recipe: StudioRecipeId;
  /** First archive hour; bar `i` closes at `startAt + i` hours. */
  startAt: number;
  split: number;
  price: Float32Array;
  buy: Float32Array | null;
  /** Null when the recipe has no sell line or the line shares the buy indicator's panel. */
  sell: Float32Array | null;
  /** True when the sell line is drawn on the buy indicator's panel. */
  shared: boolean;
  trace: { buys: number[]; sells: number[]; value: Float32Array };
}

export function studioSeries(
  market: QuantMarket,
  input: StudioState,
  costs: QuantScreenCosts,
  cache: QuantScreenCache
): StudioSeries {
  const state = normalizeStudioState(input);
  const recipe = studioRecipe(state.recipe);
  const indicator = (line: StudioLine | null) =>
    line ? Float32Array.from(screenQuantSeries(market, line.indicator(state.values), cache).value) : null;
  const buyLeaf = recipe.buyLine?.indicator(state.values);
  const sellLeaf = recipe.sellLine?.indicator(state.values);
  // Lines on the same indicator share one panel, so the sell series is not sent twice.
  const shared = !!buyLeaf && !!sellLeaf && buyLeaf.kind === sellLeaf.kind && buyLeaf.window === sellLeaf.window;
  const periods = studioPeriods(market);
  const candidate = studioCandidate(state);
  const signals = screenQuantSignals(market, candidate, cache);
  const trace = { buys: [] as number[], sells: [] as number[], value: new Float64Array(market.closes.length) };
  const amount = Number(candidate.amount);
  screenPeriods(market, signals, amount, periods.first, costs, trace);
  screenPeriods(market, signals, amount, periods.second, costs, trace);
  return {
    recipe: recipe.id,
    startAt: market.timestamps[0],
    split: periods.split,
    price: Float32Array.from(market.closes),
    buy: indicator(recipe.buyLine),
    sell: shared ? null : indicator(recipe.sellLine),
    shared,
    trace: { buys: trace.buys, sells: trace.sells, value: Float32Array.from(trace.value) },
  };
}

/* ------------------------------------------------------------------------------------------------
 * Tier 2: exact results
 * ---------------------------------------------------------------------------------------------- */

/** One half of the exact replay: its chained periods compounded like walk-forward folds. */
export interface StudioHalf {
  startAt: number;
  endAt: number;
  returnPercent: string;
  drawdownPercent: string;
  trades: number;
  fills: QuantFill[];
  /** Chained portfolio value in XOR, restarting from the research capital at the half's start. */
  equity: QuantEquityPoint[];
  maxImpactPercent: string;
  /** Exact token price change over the same hours, for the holding comparison. */
  holdPercent: string;
}

/** Exact replays of both halves; every number the studio prints comes from here. */
export interface StudioReplay {
  candidate: QuantCandidate;
  splitAt: number;
  first: StudioHalf;
  second: StudioHalf;
  /** Trading frequency and holding time over the second half. */
  cadence: QuantCadence;
  /** Latest archived close in XOR per token, for sizing the paper bot's output cap. */
  latestClose: string;
}

/** Render 36-decimal close units as a natural decimal string. */
function closeText(units: bigint): string {
  const digits = units.toString().padStart(37, '0');
  const fraction = digits.slice(-36).replace(/0+$/, '');
  return `${digits.slice(0, -36)}${fraction ? `.${fraction}` : ''}`;
}

/** Larger of two non-negative two-decimal percentage strings, compared exactly. */
const largerPercent = (a: string, b: string) => (BigInt(b.replace('.', '')) > BigInt(a.replace('.', '')) ? b : a);

function exactHalf(
  market: QuantMarket,
  candidate: QuantCandidate,
  periods: StudioPeriods,
  costs: QuantCosts
): StudioHalf {
  const replays = periods.map(([from, to]) => replayQuantCandidate(market, candidate, from, to, costs));
  const chained = chainQuantReplays(replays);
  const from = periods[0][0];
  const to = periods[periods.length - 1][1];
  return {
    startAt: market.timestamps[from],
    endAt: market.timestamps[to - 1],
    returnPercent: chained.returnPercent,
    drawdownPercent: chained.drawdownPercent,
    trades: replays.reduce((total, replay) => total + replay.trades, 0),
    fills: replays.flatMap((replay) => replay.fills),
    equity: chained.equity,
    maxImpactPercent: replays.reduce((largest, replay) => largerPercent(largest, replay.maxImpactPercent), '0.00'),
    holdPercent: quantPriceChange(market, from, to),
  };
}

export function studioReplay(market: QuantMarket, input: StudioState, costs: QuantCosts): StudioReplay {
  const candidate = studioCandidate(input);
  const periods = studioPeriods(market);
  const first = exactHalf(market, candidate, periods.first, costs);
  const second = exactHalf(market, candidate, periods.second, costs);
  return {
    candidate,
    splitAt: market.timestamps[periods.split],
    first,
    second,
    cadence: quantCadence(second.fills, second.startAt, second.endAt),
    latestClose: closeText(market.closeUnits[market.closeUnits.length - 1]),
  };
}

/* ------------------------------------------------------------------------------------------------
 * Presets from the Quant Loop
 * ---------------------------------------------------------------------------------------------- */

/**
 * Map a ready-made Quant Loop candidate id (for example `reversion:48/15/10:3`) to the studio
 * state with the same rules, so the strategy map can open any tested strategy for editing.
 */
export function studioStateFromCandidateId(id: string): StudioState | null {
  const match = /^(reversion|guarded|shock|trend|breakout):([-\d./]{1,40}):([123])$/.exec(id);
  if (!match) return null;
  const parts = match[2].split('/').map(Number);
  if (parts.some((value) => !Number.isFinite(value))) return null;
  const amount = Number(match[3]);
  const [a, b, c, d] = parts;
  const values: Record<string, Record<string, number>> = {
    reversion: { window: a, buy: b, sell: c },
    guarded: { window: a, buy: b, sell: c, guard: -d },
    shock: { hours: a, drop: b, average: c, sell: d },
    trend: { window: a, lead: b, exit: 0 },
    breakout: { window: a, exitWindow: b },
  };
  const recipe = { reversion: 'dip', guarded: 'steady-dip', shock: 'drop', trend: 'trend', breakout: 'breakout' }[
    match[1]
  ] as StudioRecipeId;
  const expected = values[match[1]];
  if (Object.values(expected).some((value) => value === undefined || !Number.isFinite(value))) return null;
  const state = normalizeStudioState({ recipe, values: { ...expected, amount } });
  // Off-grid values would silently change the rules; refuse instead of snapping.
  return Object.entries(expected).every(([key, value]) => state.values[key] === value) ? state : null;
}

/** Bounded studio deep-link text: `<market symbol>~<recipe>~<values>~<amount>`. */
export function encodeStudioLink(market: string, input: StudioState): string {
  const state = normalizeStudioState(input);
  const recipe = studioRecipe(state.recipe);
  const values = recipe.params.filter((param) => param.key !== 'amount').map((param) => num(state.values[param.key]));
  return `${market}~${recipe.id}~${values.join('_')}~${num(state.values.amount)}`;
}

/** Parse a studio deep link; malformed, off-grid or oversized input returns null. */
export function decodeStudioLink(value: unknown): { market: string; state: StudioState } | null {
  if (typeof value !== 'string' || value.length > 160) return null;
  const match = /^([A-Za-z0-9]{1,12})~([a-z-]{2,16})~([-\d._]{1,100})~([123])$/.exec(value);
  if (!match || !RECIPES.has(match[2] as StudioRecipeId)) return null;
  const recipe = studioRecipe(match[2]);
  const keys = recipe.params.filter((param) => param.key !== 'amount');
  const parts = match[3].split('_').map(Number);
  if (parts.length !== keys.length || parts.some((part) => !Number.isFinite(part))) return null;
  const values: StudioValues = { amount: Number(match[4]) };
  keys.forEach((param, index) => (values[param.key] = parts[index]));
  const state = normalizeStudioState({ recipe: recipe.id, values });
  if (keys.some((param) => state.values[param.key] !== values[param.key])) return null;
  return { market: match[1], state };
}

/* ------------------------------------------------------------------------------------------------
 * Engine shared by the studio worker and its in-thread fallback
 * ---------------------------------------------------------------------------------------------- */

export interface StudioMarketInfo {
  symbol: string;
  address: string;
  decimals: number;
  medianXorDepth: number;
  /** Deep enough for the 2 XOR orders the research tests. */
  tradable: boolean;
}

export interface StudioArchiveInfo {
  genesisHash: string;
  denominator: string;
  startAt: number;
  endAt: number;
  hours: number;
  splitAt: number;
  markets: StudioMarketInfo[];
}

interface StudioJobBase {
  market: string;
  state: StudioState;
  costs: QuantCosts;
}
/** `probe` replays any state exactly for a tooltip without touching the current choice. */
export type StudioJob =
  | (StudioJobBase & { type: 'landscape' })
  | (StudioJobBase & { type: 'series' })
  | (StudioJobBase & { type: 'replay' })
  | (StudioJobBase & { type: 'probe' })
  | (StudioJobBase & { type: 'grid' });
export type StudioJobType = StudioJob['type'];

export type StudioJobResult =
  | { type: 'landscape'; landscape: StudioLandscape }
  | { type: 'series'; series: StudioSeries }
  | { type: 'replay'; replay: StudioReplay }
  | { type: 'probe'; replay: StudioReplay }
  | { type: 'grid'; grid: StudioGrid };

export interface StudioEngine {
  info: StudioArchiveInfo;
  /** Run a quick job synchronously. */
  run(job: Exclude<StudioJob, { type: 'grid' }>): StudioJobResult;
  /** Start a grid job; the caller steps it so other jobs can run in between. */
  grid(job: Extract<StudioJob, { type: 'grid' }>): StudioGridBuilder;
}

const DECIMAL = /^(0|[1-9]\d*)(\.\d{1,36})?$/;
const RESULT_CACHE_LIMIT = 12;
/** Hover probes are small and often revisited, so they get their own, larger memo. */
const PROBE_CACHE_LIMIT = 48;

/** Reject malformed or implausible costs before any simulation uses them. */
function checkedCosts(costs: QuantCosts): QuantCosts {
  const fields = [costs?.networkFeeXor, costs?.swapFeePercent, costs?.slippagePercent];
  if (!fields.every((value) => typeof value === 'string' && value.length <= 60 && DECIMAL.test(value)))
    throw new Error('bots.errors.config');
  if (Number(costs.swapFeePercent) >= 100 || Number(costs.slippagePercent) >= 100 || Number(costs.networkFeeXor) > 2)
    throw new Error('bots.errors.config');
  return costs;
}

/**
 * Hold one parsed archive and answer studio jobs. Tier 1 memos are kept per market and
 * bounded; landscapes and grids are memoised for quick back-and-forth between choices.
 */
export function createStudioEngine(archive: QuantArchive, minDepth = QUANT_MIN_MEDIAN_XOR_DEPTH): StudioEngine {
  const markets = new Map(archive.markets.map((market) => [market.asset.symbol, market]));
  const caches = new Map<string, QuantScreenCache>();
  const results = new Map<string, StudioJobResult>();
  const probes = new Map<string, StudioJobResult>();
  const marketFor = (symbol: string) => {
    const market = markets.get(symbol);
    if (!market || market.medianXorDepth < minDepth) throw new Error('bots.errors.config');
    let cache = caches.get(symbol);
    if (!cache) caches.set(symbol, (cache = createQuantScreenCache()));
    return { market, cache };
  };
  const reference = archive.markets[0];
  const info: StudioArchiveInfo = {
    genesisHash: archive.genesisHash,
    denominator: archive.denominator,
    startAt: archive.startAt,
    endAt: archive.endAt,
    hours: archive.hours,
    splitAt: reference ? reference.timestamps[studioSplit(reference)] : archive.startAt,
    markets: archive.markets.map((market) => ({
      symbol: market.asset.symbol,
      address: market.asset.address,
      decimals: market.asset.decimals,
      medianXorDepth: market.medianXorDepth,
      tradable: market.medianXorDepth >= minDepth,
    })),
  };
  /** Landscapes ignore their own axis values; every other value and the costs are part of the key. */
  const landscapeKey = (job: StudioJob, state: StudioState) => {
    const [x, y] = studioRecipe(state.recipe).axes;
    const values = { ...state.values, [x]: 0, [y]: 0 };
    return JSON.stringify(['landscape', job.market, state.recipe, values, job.costs]);
  };
  const memo = (
    key: string,
    compute: () => StudioJobResult,
    store = results,
    limit = RESULT_CACHE_LIMIT
  ): StudioJobResult => {
    const cached = store.get(key);
    if (cached) return cached;
    const value = compute();
    if (store.size >= limit) store.delete(store.keys().next().value as string);
    store.set(key, value);
    return value;
  };
  return {
    info,
    run(job) {
      const costs = checkedCosts(job.costs);
      const state = normalizeStudioState(job.state);
      const { market, cache } = marketFor(job.market);
      if (job.type === 'landscape')
        return memo(landscapeKey(job, state), () => ({
          type: 'landscape',
          landscape: studioLandscape(market, state, quantScreenCosts(costs), cache),
        }));
      if (job.type === 'series')
        return { type: 'series', series: studioSeries(market, state, quantScreenCosts(costs), cache) };
      if (job.type === 'replay') return { type: 'replay', replay: studioReplay(market, state, costs) };
      if (job.type === 'probe')
        return memo(
          JSON.stringify(['probe', job.market, state, costs]),
          () => ({ type: 'probe', replay: studioReplay(market, state, costs) }),
          probes,
          PROBE_CACHE_LIMIT
        );
      throw new Error('bots.errors.config');
    },
    grid(job) {
      const costs = checkedCosts(job.costs);
      const state = normalizeStudioState(job.state);
      const { market, cache } = marketFor(job.market);
      const key = JSON.stringify(['grid', job.market, state.recipe, studioGridValues(state), costs]);
      const cached = results.get(key);
      if (cached?.type === 'grid') return { rows: cached.grid.rows, step: () => cached.grid };
      const builder = studioGridBuilder(market, state, quantScreenCosts(costs), cache);
      return {
        rows: builder.rows,
        step(count) {
          const grid = builder.step(count);
          if (grid) memo(key, () => ({ type: 'grid', grid }));
          return grid;
        },
      };
    },
  };
}

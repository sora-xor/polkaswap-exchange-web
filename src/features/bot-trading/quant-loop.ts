/**
 * Self-improving liquidity-shock research loop ("Quant Loop").
 *
 * SORA XYK pools are thin: a single large swap can push a pool far from its recent
 * mean, and the price often stays dislocated until other traders return. The loop
 * searches rule strategies that supply liquidity into those dislocations, using the
 * bundled archive's exact hourly reserves for every simulated fill.
 *
 * Two tiers keep speed and money arithmetic separate:
 * - Tier 1 ranks every candidate with Float64 arithmetic. Floating-point values only
 *   order hypotheses; they never become a displayed result, bot amount or transaction.
 * - Tier 2 replays each selected candidate with exact integer XYK fills, codec fees
 *   and the live rule engine's decision semantics. Every reported metric comes from it.
 *
 * Selection is walk-forward: each fold selects only from earlier hours, then trades the
 * following hours blind. A market is deployable only when the latest selection passes
 * the robustness gates and the chained out-of-sample folds made money after all costs.
 * Results are hypothetical research on historical pool states, never a profit promise.
 */
import type { StrategyRules } from './strategy-rules';
import type { BotAsset } from './types';

/** Bundled archive path; relative so the static app also works under an IPFS prefix. */
export const QUANT_ARCHIVE_URL = './bot-history/sora-mainnet-hourly-2026-03-01.json';
/** Hypothetical research capital per market, in XOR, including the protected fee reserve. */
export const QUANT_CAPITAL_XOR = '10';
/** Protected network-fee reserve inside the research capital, in XOR. */
export const QUANT_FEE_BUDGET_XOR = '2';
/** Order sizes tested per buy, in XOR. Larger orders move these pools too far. */
export const QUANT_AMOUNTS = ['2', '3'] as const;
/** Initial training share and number of expanding walk-forward folds. */
export const QUANT_TRAIN_PERCENT = 50;
export const QUANT_FOLDS = 4;
/** A market needs this median XOR depth (in XOR) before a 2 XOR order is worth testing. */
export const QUANT_MIN_MEDIAN_XOR_DEPTH = 20;
/**
 * Training gates: enough activity and profit in most independent quarters. Drawdown is
 * penalised in the score rather than capped: buying deep dislocations is inherently
 * drawdown-tolerant, so the observed walk-forward drawdown is disclosed before deployment.
 */
export const QUANT_MIN_TRAIN_TRADES = 8;
export const QUANT_MIN_POSITIVE_QUARTERS = 3;
/** Deployment gate on chained out-of-sample folds. */
export const QUANT_MIN_OOS_TRADES = 6;

const SCALE = 10n ** 36n;
const HUNDRED = 100n;
const MAX_ROWS = 20_000;
const HASH = /^0x[0-9a-f]{64}$/;
const U128_MAX = (1n << 128n) - 1n;
const DECIMAL = /^(0|[1-9]\d*)(\.\d{1,36})?$/;

export type QuantFamily = 'reversion' | 'guarded' | 'shock' | 'trend' | 'breakout';
export const QUANT_FAMILIES: readonly QuantFamily[] = ['reversion', 'guarded', 'shock', 'trend', 'breakout'];

/** One XOR-paired market reconstructed from exact archived reserves. */
export interface QuantMarket {
  asset: BotAsset;
  timestamps: number[];
  /** Exact pool reserves in base units, from the same finalized historical state. */
  xorReserves: bigint[];
  tokenReserves: bigint[];
  /** Token price in XOR at 36 decimal places, floored exactly like the archive history loader. */
  closeUnits: bigint[];
  /** Ranking-only floating-point closes; never used for a reported amount. */
  closes: Float64Array;
  /** Median XOR-side depth in whole XOR, used only for the liquidity gate. */
  medianXorDepth: number;
}

export interface QuantArchive {
  genesisHash: string;
  denominator: string;
  generatedAt: number;
  startAt: number;
  endAt: number;
  hours: number;
  xor: BotAsset;
  markets: QuantMarket[];
}

/** One rule candidate with an exact order size in XOR. */
export interface QuantCandidate {
  id: string;
  family: QuantFamily;
  amount: string;
  rules: StrategyRules;
}

/** Current chain costs applied to historical states. Strings keep exact decimal values. */
export interface QuantCosts {
  networkFeeXor: string;
  swapFeePercent: string;
  /** Charged as a full cost on every fill, matching the workspace's conservative research convention. */
  slippagePercent: string;
}

export interface QuantFill {
  timestamp: number;
  side: 'buy' | 'sell';
  /** Natural decimal strings, derived from exact base units. */
  input: string;
  output: string;
  fee: string;
  /** Exact decision close used for sizing, in XOR per token. */
  price: string;
  /** Realized change of this fill against its cost basis, for sells; buys report 0. */
  pnlPercent: string;
  impactPercent: string;
}

export interface QuantEquityPoint {
  timestamp: number;
  /** Portfolio value in XOR, with inventory marked at its exact liquidation proceeds. */
  value: string;
  /** Exact token close in XOR at the same hour; present on chained walk-forward points. */
  price?: string;
}

/** Exact replay metrics. Percentages are decimal strings with two places. */
export interface QuantReplay {
  returnPercent: string;
  drawdownPercent: string;
  trades: number;
  fills: QuantFill[];
  equity: QuantEquityPoint[];
  maxImpactPercent: string;
}

export interface QuantFold {
  startAt: number;
  endAt: number;
  candidateId: string | null;
  family: QuantFamily | null;
  robust: number;
  returnPercent: string;
  trades: number;
  /** Token price change over the same hours, from exact spot closes. */
  priceChangePercent: string;
}

/**
 * A trading episode starts with a buy while flat (after a sell or at the start) and ends
 * with the last fill before the next episode. Durations are whole hours between fills.
 */
export interface QuantCadence {
  episodes: number;
  /** Blind days per episode; null when no episode occurred. */
  daysPerEpisode: number | null;
  holdHours: { min: number; max: number } | null;
  lastEntryAt: number | null;
}

/** Summarise trading episodes from chronological fills over a span of blind days. */
export function quantCadence(fills: readonly QuantFill[], startAt: number, endAt: number): QuantCadence {
  const episodes: { start: number; end: number }[] = [];
  let previous: QuantFill['side'] = 'sell';
  for (const fill of fills) {
    if (fill.side === 'buy' && previous === 'sell') episodes.push({ start: fill.timestamp, end: fill.timestamp });
    else if (episodes.length) episodes[episodes.length - 1].end = fill.timestamp;
    previous = fill.side;
  }
  const days = Math.max(0, endAt - startAt) / 86_400_000;
  const holds = episodes.map((episode) => Math.round((episode.end - episode.start) / 3_600_000));
  return {
    episodes: episodes.length,
    daysPerEpisode: episodes.length ? Math.round((days / episodes.length) * 10) / 10 : null,
    holdHours: holds.length ? { min: Math.min(...holds), max: Math.max(...holds) } : null,
    lastEntryAt: episodes.length ? episodes[episodes.length - 1].start : null,
  };
}

export interface QuantMarketResult {
  asset: BotAsset;
  status: 'deploy' | 'watch' | 'thin';
  medianXorDepth: number;
  folds: QuantFold[];
  /** Chained exact out-of-sample performance across every fold. */
  walkForward: {
    startAt: number;
    endAt: number;
    returnPercent: string;
    drawdownPercent: string;
    trades: number;
    priceChangePercent: string;
    equity: QuantEquityPoint[];
    fills: QuantFill[];
    /** How often the strategy traded and how long positions stayed open, from the blind folds. */
    cadence: QuantCadence;
  } | null;
  /** Latest selection over all hours; deployable only when status is `deploy`. */
  final: {
    candidate: QuantCandidate;
    robust: number;
    train: Omit<QuantReplay, 'fills' | 'equity'>;
  } | null;
}

export interface QuantMeshNode {
  id: string;
  market: string;
  family: QuantFamily;
  /** 0..1 rank within its market; visual weight only. */
  weight: number;
  robust: boolean;
  selected: boolean;
}

export interface QuantLoopResult {
  version: 1;
  testedAt: number;
  archive: Pick<QuantArchive, 'genesisHash' | 'denominator' | 'generatedAt' | 'startAt' | 'endAt' | 'hours'>;
  costs: QuantCosts;
  counts: {
    candidates: number;
    markets: number;
    backtests: number;
    killed: number;
    robust: number;
    deployable: number;
  };
  markets: QuantMarketResult[];
  mesh: QuantMeshNode[];
  /** Exact per-family totals across every simulated market at the final selection. */
  families: { family: QuantFamily; tested: number; robust: number }[];
}

export type QuantPhase = 'data' | 'generate' | 'backtest' | 'robustness' | 'walkforward' | 'verify' | 'done';

export interface QuantProgress {
  phase: QuantPhase;
  market: string;
  fold: number;
  folds: number;
  backtests: number;
  killed: number;
  robust: number;
  candidates: number;
  /** Completed selection steps out of the total, for real progress display. */
  completed: number;
  total: number;
}

export interface QuantLoopOptions {
  now?: number;
  signal?: AbortSignal;
  onProgress?: (progress: QuantProgress) => void;
  /** Lets a main-thread fallback paint between markets; workers may omit it. */
  yieldControl?: () => Promise<void>;
}

/* ------------------------------------------------------------------------------------------------
 * Exact decimal helpers
 * ---------------------------------------------------------------------------------------------- */

const pow10 = (exponent: number) => 10n ** BigInt(exponent);

/** Parse a nonnegative decimal into units at `decimals` places, rejecting extra precision. */
function units(value: string, decimals: number): bigint {
  if (typeof value !== 'string' || value.length > 100 || !DECIMAL.test(value)) throw new Error('bots.errors.amount');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error('bots.errors.amount');
  return BigInt(whole) * pow10(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
}

/** Render base units as a natural decimal string without trailing zeros. */
function natural(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals ? digits.slice(-decimals).replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Format numerator/denominator as a percentage with two decimals, truncated toward zero. */
function percentOf(numerator: bigint, denominator: bigint, roundUp = false): string {
  if (denominator <= 0n) throw new Error('bots.errors.history');
  const scaled = numerator * HUNDRED * 100n;
  let hundredths = scaled / denominator;
  if (roundUp && scaled % denominator !== 0n && scaled > 0n) hundredths += 1n;
  const negative = hundredths < 0n;
  const magnitude = negative ? -hundredths : hundredths;
  const text = `${magnitude / 100n}.${(magnitude % 100n).toString().padStart(2, '0')}`;
  return negative && magnitude !== 0n ? `-${text}` : text;
}

/** Parse a percentage string such as "0.6" into a rational with a power-of-ten denominator. */
function percentRational(value: string): { numerator: bigint; denominator: bigint } {
  const fraction = value.split('.')[1] ?? '';
  const denominator = pow10(fraction.length) * HUNDRED;
  const numerator = units(value, fraction.length);
  if (numerator >= denominator) throw new Error('bots.errors.policy');
  return { numerator, denominator };
}

/* ------------------------------------------------------------------------------------------------
 * Archive parsing
 * ---------------------------------------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};

function reserve(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,38})$/.test(value)) throw new Error('bots.errors.history');
  const parsed = BigInt(value);
  if (parsed > U128_MAX) throw new Error('bots.errors.history');
  return parsed;
}

/**
 * Validate the bundled archive and rebuild every XOR-paired market. Rows must be hourly,
 * ascending and share one denominator; a market is kept only when its pool exists in
 * every row, so simulated bars never bridge a gap.
 */
export function parseQuantArchive(value: unknown): QuantArchive {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.kind !== 'sora-pool-reserves-hourly' ||
    typeof value.genesisHash !== 'string' ||
    !HASH.test(value.genesisHash) ||
    typeof value.baseAsset !== 'string' ||
    !Array.isArray(value.assets) ||
    !Array.isArray(value.rows) ||
    value.rows.length < 2 ||
    value.rows.length > MAX_ROWS ||
    !Number.isSafeInteger(value.generatedAt)
  )
    throw new Error('bots.errors.history');
  const base = value.baseAsset;
  const rows = value.rows as unknown[];
  const first = rows[0];
  if (!isRecord(first) || !isRecord(first.metadata) || typeof first.denominator !== 'string')
    throw new Error('bots.errors.history');
  const denominator = first.denominator;
  if (!/^[1-9]\d{0,119}$/.test(denominator)) throw new Error('bots.errors.history');
  const baseMeta = first.metadata[base];
  if (!isRecord(baseMeta) || baseMeta.symbol !== 'XOR' || baseMeta.decimals !== 18)
    throw new Error('bots.errors.history');
  const xor: BotAsset = { address: base, symbol: 'XOR', decimals: 18 };
  const candidates = (value.assets as unknown[])
    .filter(
      (asset): asset is { address: string; symbol: string } => isRecord(asset) && typeof asset.address === 'string'
    )
    .filter((asset) => asset.address !== base);
  const timestamps: number[] = [];
  const series = new Map<string, { asset: BotAsset; xor: bigint[]; token: bigint[] } | null>();
  let previous = -1;
  for (const row of rows) {
    if (
      !isRecord(row) ||
      !Number.isSafeInteger(row.timestamp) ||
      (row.timestamp as number) <= previous ||
      ((previous >= 0 && (row.timestamp as number) - previous !== 3_600_000) as boolean) ||
      row.denominator !== denominator ||
      !isRecord(row.pools) ||
      !isRecord(row.metadata)
    )
      throw new Error('bots.errors.history');
    previous = row.timestamp as number;
    timestamps.push(previous);
    for (const asset of candidates) {
      const entry = series.get(asset.address);
      if (entry === null) continue;
      const pool = row.pools[asset.address];
      const metadata = row.metadata[asset.address];
      if (
        !Array.isArray(pool) ||
        pool.length !== 2 ||
        !isRecord(metadata) ||
        typeof metadata.symbol !== 'string' ||
        !Number.isInteger(metadata.decimals) ||
        (metadata.decimals as number) < 0 ||
        (metadata.decimals as number) > 36
      ) {
        series.set(asset.address, null);
        continue;
      }
      const x = reserve(pool[0]);
      const t = reserve(pool[1]);
      if (x === 0n || t === 0n) {
        series.set(asset.address, null);
        continue;
      }
      const current = entry ?? {
        asset: { address: asset.address, symbol: metadata.symbol, decimals: metadata.decimals as number },
        xor: [],
        token: [],
      };
      if (current.asset.symbol !== metadata.symbol || current.asset.decimals !== metadata.decimals)
        throw new Error('bots.errors.history');
      current.xor.push(x);
      current.token.push(t);
      series.set(asset.address, current);
    }
  }
  const markets: QuantMarket[] = [];
  for (const entry of series.values()) {
    if (!entry || entry.xor.length !== timestamps.length) continue;
    const exponent = 36 + entry.asset.decimals - xor.decimals;
    if (exponent < 0) continue;
    const scale = pow10(exponent);
    const closeUnits = entry.xor.map((x, index) => (x * scale) / entry.token[index]);
    if (closeUnits.some((close) => close <= 0n)) continue;
    const depth = entry.xor.map((x) => Number(x / pow10(xor.decimals - 2)) / 100).sort((a, b) => a - b);
    markets.push({
      asset: entry.asset,
      timestamps,
      xorReserves: entry.xor,
      tokenReserves: entry.token,
      closeUnits,
      closes: Float64Array.from(closeUnits, (close) => Number(close / 10n ** 18n) / 1e18),
      medianXorDepth: depth[Math.floor(depth.length / 2)],
    });
  }
  return {
    genesisHash: value.genesisHash,
    denominator,
    generatedAt: value.generatedAt as number,
    startAt: timestamps[0],
    endAt: timestamps[timestamps.length - 1],
    hours: timestamps.length,
    xor,
    markets,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Candidate generation
 * ---------------------------------------------------------------------------------------------- */

type Leaf = StrategyRules['entry']['conditions'][number];

const deviation = (window: number, direction: 'above' | 'below', threshold: number): Leaf => ({
  kind: 'deviation',
  window,
  direction,
  threshold: String(threshold),
});
const momentum = (window: number, direction: 'above' | 'below', threshold: number): Leaf => ({
  kind: 'momentum',
  window,
  direction,
  threshold: String(threshold),
});
const breakout = (window: number, direction: 'above' | 'below'): Leaf => ({ kind: 'breakout', window, direction });
const rules = (entry: Leaf[], exit: Leaf[]): StrategyRules => ({
  version: 1,
  entry: { operator: 'all', conditions: entry },
  exit: { operator: 'all', conditions: exit },
});

/**
 * Deterministic candidate grid. Reversion families buy deep dislocations and sell the
 * recovery; trend and breakout families are challengers that must beat the same costs.
 */
export function generateQuantCandidates(): QuantCandidate[] {
  const list: QuantCandidate[] = [];
  const add = (family: QuantFamily, key: string, rule: StrategyRules) => {
    for (const amount of QUANT_AMOUNTS) list.push({ id: `${family}:${key}:${amount}`, family, amount, rules: rule });
  };
  for (const window of [24, 48, 96, 168])
    for (const depth of [15, 20, 25, 30, 40])
      for (const recovery of [-5, 0, 5, 10]) {
        const exit = [deviation(window, 'above', recovery)];
        add('reversion', `${window}/${depth}/${recovery}`, rules([deviation(window, 'below', -depth)], exit));
        for (const guard of [-15, -30])
          add(
            'guarded',
            `${window}/${depth}/${recovery}/${guard}`,
            rules([deviation(window, 'below', -depth), momentum(168, 'above', guard)], exit)
          );
      }
  for (const lookback of [2, 3, 6])
    for (const drop of [12, 18, 25, 35])
      for (const window of [24, 48])
        for (const recovery of [-5, 0, 5])
          add(
            'shock',
            `${lookback}/${drop}/${window}/${recovery}`,
            rules([momentum(lookback, 'below', -drop)], [deviation(window, 'above', recovery)])
          );
  for (const window of [24, 48, 96, 168])
    for (const lead of [2, 5, 10, 20])
      add('trend', `${window}/${lead}`, rules([deviation(window, 'above', lead)], [deviation(window, 'below', 0)]));
  for (const window of [24, 48, 96, 168])
    for (const exitWindow of [24, 48])
      add('breakout', `${window}/${exitWindow}`, rules([breakout(window, 'above')], [breakout(exitWindow, 'below')]));
  return list;
}

/** Largest number of closes a candidate's leaves need, matching `requiredRuleCandles`. */
function leafCandles(leaf: Leaf): number {
  if (leaf.kind === 'momentum' || leaf.kind === 'breakout') return leaf.window + 1;
  return leaf.window;
}

/* ------------------------------------------------------------------------------------------------
 * Tier 1: ranking-only screening
 * ---------------------------------------------------------------------------------------------- */

/** Per-market cache of leaf pass arrays: -1 not ready, 0 failed, 1 passed. */
type LeafCache = Map<string, Int8Array>;

function leafKey(leaf: Leaf): string {
  return JSON.stringify(leaf);
}

/** Compute one leaf for every bar with the rule engine's definitions, in Float64. */
function screenLeaf(market: QuantMarket, leaf: Leaf, cache: LeafCache): Int8Array {
  const key = leafKey(leaf);
  const cached = cache.get(key);
  if (cached) return cached;
  const p = market.closes;
  const out = new Int8Array(p.length).fill(-1);
  const below = leaf.direction === 'below';
  if (leaf.kind === 'deviation') {
    const threshold = Number(leaf.threshold);
    let sum = 0;
    for (let i = 0; i < p.length; i++) {
      sum += p[i];
      if (i >= leaf.window) sum -= p[i - leaf.window];
      if (i < leaf.window - 1) continue;
      const value = ((p[i] * leaf.window - sum) * 100) / sum;
      out[i] = (below ? value < threshold : value > threshold) ? 1 : 0;
    }
  } else if (leaf.kind === 'momentum') {
    const threshold = Number(leaf.threshold);
    for (let i = leaf.window; i < p.length; i++) {
      const value = ((p[i] - p[i - leaf.window]) * 100) / p[i - leaf.window];
      out[i] = (below ? value < threshold : value > threshold) ? 1 : 0;
    }
  } else if (leaf.kind === 'breakout') {
    for (let i = leaf.window; i < p.length; i++) {
      let extreme = p[i - leaf.window];
      for (let j = i - leaf.window + 1; j < i; j++) extreme = below ? Math.min(extreme, p[j]) : Math.max(extreme, p[j]);
      out[i] = (below ? p[i] < extreme : p[i] > extreme) ? 1 : 0;
    }
  } else throw new Error('bots.errors.strategy');
  cache.set(key, out);
  return out;
}

/** Combine `all` groups into one signal array: 1 buy, 2 sell, 0 hold, -1 warm-up. */
function screenSignals(market: QuantMarket, candidate: QuantCandidate, cache: LeafCache): Int8Array {
  const key = `signal:${JSON.stringify(candidate.rules)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const entry = candidate.rules.entry.conditions.map((leaf) => screenLeaf(market, leaf, cache));
  const exit = (candidate.rules.exit?.conditions ?? []).map((leaf) => screenLeaf(market, leaf, cache));
  const out = new Int8Array(market.closes.length);
  for (let i = 0; i < out.length; i++) {
    let ready = true;
    let entryPass = true;
    let exitPass = exit.length > 0;
    for (const leaf of entry) {
      if (leaf[i] < 0) ready = false;
      else if (leaf[i] === 0) entryPass = false;
    }
    for (const leaf of exit) {
      if (leaf[i] < 0) ready = false;
      else if (leaf[i] === 0) exitPass = false;
    }
    out[i] = !ready ? -1 : exitPass ? 2 : entryPass ? 1 : 0;
  }
  cache.set(key, out);
  return out;
}

interface ScreenCosts {
  fee: number;
  swap: number;
  slippage: number;
  capital: number;
  budget: number;
}

/** Ranking-only replay with the engine's fill semantics; returns approximate metrics. */
function screen(
  market: QuantMarket,
  signals: Int8Array,
  amount: number,
  from: number,
  to: number,
  costs: ScreenCosts
): { ret: number; trades: number; mdd: number } {
  const p = market.closes;
  const keep = (1 - costs.swap) * (1 - costs.slippage);
  let xor = costs.capital;
  let tokens = 0;
  let fees = 0;
  let trades = 0;
  let peak = xor;
  let mdd = 0;
  let pending = 0;
  let decision = 0;
  for (let i = from; i < to; i++) {
    if (pending && fees + costs.fee <= costs.budget + 1e-12) {
      const x = Number(market.xorReserves[i]) / 1e18;
      const t = Number(market.tokenReserves[i]) / 10 ** market.asset.decimals;
      if (pending === 1 && xor - (costs.budget - fees) >= amount - 1e-12) {
        const net = amount * (1 - costs.swap);
        tokens += ((net * t) / (x + net)) * (1 - costs.slippage);
        xor -= amount + costs.fee;
        fees += costs.fee;
        trades++;
      } else if (pending === 2 && tokens > 0) {
        const lot = Math.min(amount / decision, tokens);
        xor += ((lot * x) / (t + lot)) * keep - costs.fee;
        tokens -= lot;
        fees += costs.fee;
        trades++;
      }
    }
    pending = 0;
    // Liquidation mark: thin pools cannot absorb an inventory at its spot value.
    let value = xor;
    if (tokens > 0) {
      const x = Number(market.xorReserves[i]) / 1e18;
      const t = Number(market.tokenReserves[i]) / 10 ** market.asset.decimals;
      value += Math.max(0, ((tokens * x) / (t + tokens)) * keep - costs.fee);
    }
    if (value > peak) peak = value;
    else if (peak > 0 && 1 - value / peak > mdd) mdd = 1 - value / peak;
    if (i < to - 1 && signals[i] > 0) {
      pending = signals[i];
      decision = p[i];
    }
  }
  if (tokens > 0 && to > 0) {
    const x = Number(market.xorReserves[to - 1]) / 1e18;
    const t = Number(market.tokenReserves[to - 1]) / 10 ** market.asset.decimals;
    xor += ((tokens * x) / (t + tokens)) * keep - costs.fee;
  }
  return { ret: xor / costs.capital - 1, trades, mdd };
}

interface Selection {
  candidate: QuantCandidate | null;
  robust: number;
  robustIds: Set<string>;
  /** Ranking-only training return per candidate, used for visual ordering. */
  scores: Map<string, number>;
  killed: number;
  backtests: number;
}

/** Select the most robust candidate using only hours before `cutoff`. */
function select(
  market: QuantMarket,
  candidates: QuantCandidate[],
  cutoff: number,
  costs: ScreenCosts,
  cache: LeafCache
): Selection {
  const quarter = Math.floor(cutoff / 4);
  let best: { candidate: QuantCandidate; score: number } | null = null;
  let backtests = 0;
  const robustIds = new Set<string>();
  const scores = new Map<string, number>();
  for (const candidate of candidates) {
    const signals = screenSignals(market, candidate, cache);
    const amount = Number(candidate.amount);
    const full = screen(market, signals, amount, 0, cutoff, costs);
    backtests++;
    scores.set(candidate.id, full.ret);
    if (full.trades < QUANT_MIN_TRAIN_TRADES || full.ret <= 0) continue;
    let positive = 0;
    let worst = Infinity;
    for (let part = 0; part < 4; part++) {
      const result = screen(market, signals, amount, part * quarter, (part + 1) * quarter, costs);
      backtests++;
      if (result.ret > 0) positive++;
      worst = Math.min(worst, result.ret);
    }
    if (positive < QUANT_MIN_POSITIVE_QUARTERS) continue;
    robustIds.add(candidate.id);
    const score = full.ret - 0.5 * full.mdd + worst;
    if (!best || score > best.score) best = { candidate, score };
  }
  return {
    candidate: best?.candidate ?? null,
    robust: robustIds.size,
    robustIds,
    scores,
    killed: candidates.length - robustIds.size,
    backtests,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Tier 2: exact replay
 * ---------------------------------------------------------------------------------------------- */

interface ExactCosts {
  feeCodec: bigint;
  swap: { numerator: bigint; denominator: bigint };
  slippage: { numerator: bigint; denominator: bigint };
}

function exactCosts(costs: QuantCosts): ExactCosts {
  return {
    feeCodec: units(costs.networkFeeXor, 18),
    swap: percentRational(costs.swapFeePercent),
    slippage: percentRational(costs.slippagePercent),
  };
}

/** Exact leaf with the rule engine's integer comparisons; prefix sums keep windows cheap. */
function exactLeaf(market: QuantMarket, prefix: bigint[], leaf: Leaf, i: number): boolean | null {
  const p = market.closeUnits;
  const below = leaf.direction === 'below';
  if (leaf.kind === 'deviation') {
    if (i < leaf.window - 1) return null;
    const sum = prefix[i + 1] - prefix[i + 1 - leaf.window];
    const threshold = units(leaf.threshold.replace('-', ''), 36) * (leaf.threshold.startsWith('-') ? -1n : 1n);
    // value = (current * window - sum) * 100 / sum, compared with threshold / SCALE.
    const left = (p[i] * BigInt(leaf.window) - sum) * HUNDRED * SCALE;
    const right = threshold * sum;
    return below ? left < right : left > right;
  }
  if (leaf.kind === 'momentum') {
    if (i < leaf.window) return null;
    const previous = p[i - leaf.window];
    const threshold = units(leaf.threshold.replace('-', ''), 36) * (leaf.threshold.startsWith('-') ? -1n : 1n);
    const left = (p[i] - previous) * HUNDRED * SCALE;
    const right = threshold * previous;
    return below ? left < right : left > right;
  }
  if (leaf.kind === 'breakout') {
    if (i < leaf.window) return null;
    let extreme = p[i - leaf.window];
    for (let j = i - leaf.window + 1; j < i; j++)
      extreme = below ? (p[j] < extreme ? p[j] : extreme) : p[j] > extreme ? p[j] : extreme;
    return below ? p[i] < extreme : p[i] > extreme;
  }
  throw new Error('bots.errors.strategy');
}

/**
 * Exact engine signal at bar `i`: 'sell' when exit matches, else 'buy' on entry; null while
 * any leaf is still warming up. Mirrors `evaluateStrategyRules` on the same exact closes.
 */
export function quantSignalAt(
  market: QuantMarket,
  prefix: bigint[],
  candidate: QuantCandidate,
  i: number
): 'buy' | 'sell' | null {
  const exitLeaves = candidate.rules.exit?.conditions ?? [];
  const entry = candidate.rules.entry.conditions.map((leaf) => exactLeaf(market, prefix, leaf, i));
  const exit = exitLeaves.map((leaf) => exactLeaf(market, prefix, leaf, i));
  if ([...entry, ...exit].some((value) => value === null)) return null;
  if (exit.length && exit.every(Boolean)) return 'sell';
  if (entry.every(Boolean)) return 'buy';
  return null;
}

/** Floor `value * (1 - rate)` for an exact percentage rate. */
const keep = (value: bigint, rate: { numerator: bigint; denominator: bigint }) =>
  (value * (rate.denominator - rate.numerator)) / rate.denominator;

/** XOR an exact XYK pool would pay for the whole inventory after pool fee, slippage and network fee. */
function liquidation(tokens: bigint, x: bigint, t: bigint, exact: ExactCosts): bigint {
  if (tokens <= 0n) return 0n;
  const out = keep(keep((tokens * x) / (t + tokens), exact.swap), exact.slippage);
  return out > exact.feeCodec ? out - exact.feeCodec : 0n;
}

/**
 * Replay one candidate over `[from, to)` with exact XYK fills at the next hour's state.
 * Open inventory is valued at the pool's actual exit proceeds at the end, not at spot.
 */
export function replayQuantCandidate(
  market: QuantMarket,
  candidate: QuantCandidate,
  from: number,
  to: number,
  costs: QuantCosts,
  prefix = prefixSums(market)
): QuantReplay {
  if (
    !Number.isSafeInteger(from) ||
    !Number.isSafeInteger(to) ||
    from < 0 ||
    to > market.closeUnits.length ||
    from >= to
  )
    throw new Error('bots.errors.history');
  const exact = exactCosts(costs);
  const xorDecimals = 18;
  const capital = units(QUANT_CAPITAL_XOR, xorDecimals);
  const budget = units(QUANT_FEE_BUDGET_XOR, xorDecimals);
  const amount = units(candidate.amount, xorDecimals);
  const amount36 = units(candidate.amount, 36);
  let xor = capital;
  let tokens = 0n;
  let costBasis = 0n;
  let fees = 0n;
  let trades = 0;
  let pending: { side: 'buy' | 'sell'; price: bigint } | null = null;
  let peak = capital;
  let worst = { numerator: 0n, denominator: 1n };
  let maxImpact = { numerator: 0n, denominator: 1n };
  const fills: QuantFill[] = [];
  const equity: QuantEquityPoint[] = [];
  const stride = Math.max(1, Math.ceil((to - from) / 240));
  for (let i = from; i < to; i++) {
    const x = market.xorReserves[i];
    const t = market.tokenReserves[i];
    if (pending && fees + exact.feeCodec <= budget) {
      if (pending.side === 'buy' && xor - (budget - fees) >= amount) {
        const net = keep(amount, exact.swap);
        const out = keep((net * t) / (x + net), exact.slippage);
        if (out > 0n) {
          xor -= amount + exact.feeCodec;
          fees += exact.feeCodec;
          tokens += out;
          costBasis += amount + exact.feeCodec;
          trades++;
          if (net * maxImpact.denominator > maxImpact.numerator * (x + net))
            maxImpact = { numerator: net, denominator: x + net };
          fills.push({
            timestamp: market.timestamps[i],
            side: 'buy',
            input: natural(amount, xorDecimals),
            output: natural(out, market.asset.decimals),
            fee: natural(exact.feeCodec, xorDecimals),
            price: natural(pending.price, 36),
            pnlPercent: '0.00',
            impactPercent: percentOf(net, x + net, true),
          });
        }
      } else if (pending.side === 'sell' && tokens > 0n) {
        // The engine sizes a sell at the decision close, floored to token base units.
        const desired = (amount36 * SCALE) / pending.price / pow10(36 - market.asset.decimals);
        const lot = desired < tokens ? desired : tokens;
        if (lot > 0n) {
          const gross = (lot * x) / (t + lot);
          const out = keep(keep(gross, exact.swap), exact.slippage);
          const basis = (costBasis * lot) / tokens;
          xor += out - exact.feeCodec;
          fees += exact.feeCodec;
          tokens -= lot;
          costBasis -= basis;
          trades++;
          if (lot * maxImpact.denominator > maxImpact.numerator * (t + lot))
            maxImpact = { numerator: lot, denominator: t + lot };
          fills.push({
            timestamp: market.timestamps[i],
            side: 'sell',
            input: natural(lot, market.asset.decimals),
            output: natural(out, xorDecimals),
            fee: natural(exact.feeCodec, xorDecimals),
            price: natural(pending.price, 36),
            pnlPercent: basis > 0n ? percentOf(out - exact.feeCodec - basis, basis) : '0.00',
            impactPercent: percentOf(lot, t + lot, true),
          });
        }
      }
    }
    pending = null;
    // Liquidation mark: XOR plus what this hour's pool would actually pay for the whole inventory.
    const value = xor + liquidation(tokens, x, t, exact);
    if (value > peak) peak = value;
    else if ((peak - value) * worst.denominator > worst.numerator * peak)
      worst = { numerator: peak - value, denominator: peak };
    if ((i - from) % stride === 0) equity.push({ timestamp: market.timestamps[i], value: natural(value, xorDecimals) });
    if (i < to - 1) {
      const side = quantSignalAt(market, prefix, candidate, i);
      if (side) pending = { side, price: market.closeUnits[i] };
    }
  }
  // Value remaining inventory at what the final pool state would actually pay.
  const final = xor + liquidation(tokens, market.xorReserves[to - 1], market.tokenReserves[to - 1], exact);
  equity.push({ timestamp: market.timestamps[to - 1], value: natural(final, xorDecimals) });
  if (final < peak && (peak - final) * worst.denominator > worst.numerator * peak)
    worst = { numerator: peak - final, denominator: peak };
  return {
    returnPercent: percentOf(final - capital, capital),
    drawdownPercent: percentOf(worst.numerator, worst.denominator, true),
    trades,
    fills,
    equity,
    maxImpactPercent: percentOf(maxImpact.numerator, maxImpact.denominator, true),
  };
}

/** Cumulative close sums: prefix[i] is the sum of the first i closes. */
export function prefixSums(market: QuantMarket): bigint[] {
  const prefix: bigint[] = [0n];
  for (const close of market.closeUnits) prefix.push(prefix[prefix.length - 1] + close);
  return prefix;
}

/* ------------------------------------------------------------------------------------------------
 * Walk-forward loop
 * ---------------------------------------------------------------------------------------------- */

/** Exact price change between two bars as a percentage string. */
function priceChange(market: QuantMarket, from: number, to: number): string {
  const start = market.closeUnits[from];
  return percentOf(market.closeUnits[to - 1] - start, start);
}

/** Compound fold returns exactly; each fold restarts from the same research capital. */
function chain(folds: { equity: QuantEquityPoint[]; returnPercent: string }[], capital: bigint) {
  let multiplier = { numerator: 1n, denominator: 1n };
  let peak = { numerator: 0n, denominator: 1n };
  let worst = { numerator: 0n, denominator: 1n };
  const equity: QuantEquityPoint[] = [];
  for (const fold of folds) {
    for (const point of fold.equity) {
      // Value relative to this fold's capital, scaled by the chained multiplier so far.
      const value = {
        numerator: units(point.value, 18) * multiplier.numerator,
        denominator: capital * multiplier.denominator,
      };
      if (value.numerator * peak.denominator > peak.numerator * value.denominator) peak = value;
      else {
        const drop = {
          numerator: peak.numerator * value.denominator - value.numerator * peak.denominator,
          denominator: peak.numerator * value.denominator,
        };
        if (drop.numerator * worst.denominator > worst.numerator * drop.denominator) worst = drop;
      }
      equity.push({
        timestamp: point.timestamp,
        value: natural((value.numerator * capital) / value.denominator, 18),
      });
    }
    const last = fold.equity[fold.equity.length - 1];
    multiplier = {
      numerator: multiplier.numerator * units(last.value, 18),
      denominator: multiplier.denominator * capital,
    };
  }
  return {
    returnPercent: percentOf(multiplier.numerator - multiplier.denominator, multiplier.denominator),
    drawdownPercent: worst.numerator === 0n ? '0.00' : percentOf(worst.numerator, worst.denominator, true),
    equity,
  };
}

const cancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error('bots.errors.stale');
};

/**
 * Run the full self-improving loop: liquidity gate, candidate generation, robust
 * selection on expanding training windows, exact blind replay of each following fold,
 * and a final selection over every hour for deployment.
 */
export async function runQuantLoop(
  archive: QuantArchive,
  costs: QuantCosts,
  options: QuantLoopOptions = {}
): Promise<QuantLoopResult> {
  exactCosts(costs);
  const candidates = generateQuantCandidates();
  const screenCosts: ScreenCosts = {
    fee: Number(costs.networkFeeXor),
    swap: Number(costs.swapFeePercent) / 100,
    slippage: Number(costs.slippagePercent) / 100,
    capital: Number(QUANT_CAPITAL_XOR),
    budget: Number(QUANT_FEE_BUDGET_XOR),
  };
  const capital = units(QUANT_CAPITAL_XOR, 18);
  const hours = archive.hours;
  const initial = Math.floor((hours * QUANT_TRAIN_PERCENT) / 100);
  const foldSize = Math.ceil((hours - initial) / QUANT_FOLDS);
  const counts = {
    candidates: candidates.length,
    markets: archive.markets.length,
    backtests: 0,
    killed: 0,
    robust: 0,
    deployable: 0,
  };
  const markets: QuantMarketResult[] = [];
  const mesh: QuantMeshNode[] = [];
  const familyTotals = new Map(QUANT_FAMILIES.map((family) => [family, { tested: 0, robust: 0 }]));
  const total = archive.markets.reduce(
    (sum, market) => sum + (market.medianXorDepth < QUANT_MIN_MEDIAN_XOR_DEPTH ? 1 : QUANT_FOLDS + 1),
    0
  );
  let completed = 0;
  const report = (phase: QuantPhase, market: string, fold: number) =>
    options.onProgress?.({
      phase,
      market,
      fold,
      folds: QUANT_FOLDS,
      backtests: counts.backtests,
      killed: counts.killed,
      robust: counts.robust,
      candidates: candidates.length * archive.markets.length,
      completed,
      total,
    });
  report('generate', '', 0);
  for (const market of archive.markets) {
    cancelled(options.signal);
    if (market.medianXorDepth < QUANT_MIN_MEDIAN_XOR_DEPTH) {
      counts.killed += candidates.length;
      markets.push({
        asset: market.asset,
        status: 'thin',
        medianXorDepth: market.medianXorDepth,
        folds: [],
        walkForward: null,
        final: null,
      });
      completed++;
      report('robustness', market.asset.symbol, 0);
      await options.yieldControl?.();
      continue;
    }
    const cache: LeafCache = new Map();
    const prefix = prefixSums(market);
    const folds: QuantFold[] = [];
    const foldReplays: QuantReplay[] = [];
    for (let fold = 0; fold < QUANT_FOLDS; fold++) {
      cancelled(options.signal);
      const start = initial + fold * foldSize;
      const end = Math.min(hours, start + foldSize);
      if (start >= end) break;
      report('backtest', market.asset.symbol, fold + 1);
      const chosen = select(market, candidates, start, screenCosts, cache);
      counts.backtests += chosen.backtests;
      completed++;
      report('walkforward', market.asset.symbol, fold + 1);
      const replay = chosen.candidate
        ? replayQuantCandidate(market, chosen.candidate, start, end, costs, prefix)
        : {
            returnPercent: '0.00',
            drawdownPercent: '0.00',
            trades: 0,
            fills: [],
            equity: [
              { timestamp: market.timestamps[start], value: QUANT_CAPITAL_XOR },
              { timestamp: market.timestamps[end - 1], value: QUANT_CAPITAL_XOR },
            ],
            maxImpactPercent: '0.00',
          };
      foldReplays.push(replay);
      folds.push({
        startAt: market.timestamps[start],
        endAt: market.timestamps[end - 1],
        candidateId: chosen.candidate?.id ?? null,
        family: chosen.candidate?.family ?? null,
        robust: chosen.robust,
        returnPercent: replay.returnPercent,
        trades: replay.trades,
        priceChangePercent: priceChange(market, start, end),
      });
      await options.yieldControl?.();
    }
    report('robustness', market.asset.symbol, QUANT_FOLDS);
    const latest = select(market, candidates, hours, screenCosts, cache);
    counts.backtests += latest.backtests;
    counts.killed += latest.killed;
    counts.robust += latest.robust;
    completed++;
    report('verify', market.asset.symbol, QUANT_FOLDS);
    const chained = chain(foldReplays, capital);
    const fills = foldReplays.flatMap((replay) => replay.fills);
    const oosTrades = foldReplays.reduce((total, replay) => total + replay.trades, 0);
    const firstHour = market.timestamps[0];
    const walkForward = {
      startAt: market.timestamps[initial],
      endAt: market.timestamps[hours - 1],
      returnPercent: chained.returnPercent,
      drawdownPercent: chained.drawdownPercent,
      trades: oosTrades,
      priceChangePercent: priceChange(market, initial, hours),
      // Archive hours are contiguous, so a timestamp maps directly to its close.
      equity: chained.equity.map((point) => ({
        ...point,
        price: natural(market.closeUnits[(point.timestamp - firstHour) / 3_600_000], 36),
      })),
      fills,
      cadence: quantCadence(fills, market.timestamps[initial], market.timestamps[hours - 1]),
    };
    let final: QuantMarketResult['final'] = null;
    if (latest.candidate) {
      const train = replayQuantCandidate(market, latest.candidate, 0, hours, costs, prefix);
      final = {
        candidate: latest.candidate,
        robust: latest.robust,
        train: {
          returnPercent: train.returnPercent,
          drawdownPercent: train.drawdownPercent,
          trades: train.trades,
          maxImpactPercent: train.maxImpactPercent,
        },
      };
    }
    const profitable = !chained.returnPercent.startsWith('-') && chained.returnPercent !== '0.00';
    const status: QuantMarketResult['status'] =
      final && profitable && oosTrades >= QUANT_MIN_OOS_TRADES ? 'deploy' : 'watch';
    if (status === 'deploy') counts.deployable++;
    markets.push({ asset: market.asset, status, medianXorDepth: market.medianXorDepth, folds, walkForward, final });
    // Visual sample per family: its strongest candidates plus evenly spaced rejections.
    for (const family of QUANT_FAMILIES) {
      const members = candidates
        .filter((candidate) => candidate.family === family)
        .map((candidate) => ({ candidate, score: latest.scores.get(candidate.id) ?? -Infinity }))
        .sort((a, b) => b.score - a.score);
      const step = Math.max(1, Math.floor(members.length / 5));
      const sample = members.filter((_item, index) => index < 4 || index % step === 0).slice(0, 9);
      for (const candidate of members) {
        const tally = familyTotals.get(family)!;
        tally.tested++;
        if (latest.robustIds.has(candidate.candidate.id)) tally.robust++;
      }
      sample.forEach((item, index) =>
        mesh.push({
          id: `${market.asset.symbol}:${item.candidate.id}`,
          market: market.asset.symbol,
          family,
          weight: 1 - index / Math.max(1, sample.length - 1),
          robust: latest.robustIds.has(item.candidate.id),
          selected: item.candidate.id === latest.candidate?.id,
        })
      );
    }
    await options.yieldControl?.();
  }
  report('done', '', QUANT_FOLDS);
  return {
    version: 1,
    testedAt: options.now ?? Date.now(),
    archive: {
      genesisHash: archive.genesisHash,
      denominator: archive.denominator,
      generatedAt: archive.generatedAt,
      startAt: archive.startAt,
      endAt: archive.endAt,
      hours: archive.hours,
    },
    costs: { ...costs },
    counts,
    markets,
    mesh,
    families: QUANT_FAMILIES.map((family) => ({ family, ...familyTotals.get(family)! })),
  };
}

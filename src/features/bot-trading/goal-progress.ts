/** Read-only display projection of validated exact accounting; no prices, qualification or authority are inferred. */
import {
  hasGoalExecutionMarker,
  readGoalExecutionBot,
  readGoalExecutionOrder,
  copyGoalStorageData,
  assertGoalOrderAccounting,
} from './goal-storage';
import { GOAL_EXACT_KUSD } from './goal-exact-ledger';
import type { BotDefinition, BotOrder } from './types';
import type { GoalExactRatio } from './goal-exact-ledger';
const UNIT = 10n ** 18n;
export interface GoalProgressOptions {
  now: number;
  runtimeStatus?: BotDefinition['status'];
  /** Undefined means loading/not supplied; null means the order read failed. Neither means zero pending. */
  orders?: readonly BotOrder[] | null;
}
export interface ExactGoalProgress {
  kind: 'exact';
  status: 'checking' | 'pending' | 'attention' | 'finalizing' | 'active' | 'paused' | 'target' | 'loss' | 'expired';
  outcome: 'active' | 'target' | 'loss' | 'expired';
  terminal: boolean;
  accountingComplete: boolean;
  canResume: boolean;
  pendingCount: number | null;
  expiredOrders: number;
  deadlineAtMs: number;
  valuedAtMs: number;
  budgetCodec: string;
  spentKusdCodec: string;
  retainedReserveCodec: string;
  feesPaidCodec: string;
  holdings: { kusdCodec: string; xorCodec: string };
  value: GoalExactRatio;
  netReturnPercent: GoalExactRatio;
  /** Current marked holdings beat leaving the opening allocation untouched, after actual fees and a finalized fill. */
  beatsIdleAfterFees: boolean;
  tone: '' | 'positive' | 'negative';
  labels: {
    budget: string;
    spent: string;
    reserve: string;
    fees: string;
    kusd: string;
    xor: string;
    value: string;
    netReturn: string;
  };
  trades: number;
  /** Later attributed effects have no new valuation or performance timestamp. */
  postDeadline?: { fees: string; trades: number; failures: number };
}
export type GoalProgressProjection = { kind: 'legacy' } | { kind: 'invalid' } | ExactGoalProgress;
/** Integer-only display rounding; small nonzero values never become an apparent zero. */
function label(n: bigint, d: bigint, places: number, signed = false, trim = true): string {
  const negative = n < 0n,
    abs = negative ? -n : n,
    scale = 10n ** BigInt(places);
  const prefix = negative ? '−' : signed && n > 0n ? '+' : '';
  if (abs && abs * scale < d) return `${prefix}<0.${'0'.repeat(places - 1)}1`;
  const rounded = (abs * scale * 2n + d) / (2n * d);
  const whole = rounded / scale;
  let fraction = (rounded % scale).toString().padStart(places, '0');
  if (trim) fraction = fraction.replace(/0+$/, '');
  return `${prefix}${whole}${fraction ? `.${fraction}` : ''}`;
}
/** Project actual persisted state only. A marked-but-invalid record never falls back to the legacy goalState. */
export function projectExactGoalProgress(raw: BotDefinition, options: GoalProgressOptions): GoalProgressProjection {
  if (!hasGoalExecutionMarker(raw)) return { kind: 'legacy' };
  try {
    if (!Number.isSafeInteger(options.now) || options.now < 0) return { kind: 'invalid' };
    const bot = readGoalExecutionBot(raw),
      state = bot.exactGoalState;
    if (
      ![state.episode.endedAtMs, state.lastMark.timestampMs].every((time) => Number.isFinite(new Date(time).getTime()))
    )
      return { kind: 'invalid' };
    let pendingCount: number | null = null,
      expiredOrders = 0,
      invalidOrders = options.orders === null;
    if (options.orders !== undefined && options.orders !== null) {
      try {
        const orders = copyGoalStorageData(options.orders);
        if (!Array.isArray(orders)) throw Error('invalid-orders');
        pendingCount = 0;
        const ownOrders = orders.filter((o) => o.botId === bot.id).map(readGoalExecutionOrder);
        assertGoalOrderAccounting(bot, ownOrders);
        for (const order of ownOrders) {
          if (['reserved', 'signed', 'submitted', 'finalized-pending'].includes(order.goalExecution.phase))
            pendingCount++;
          else if (order.goalExecution.phase === 'expired') expiredOrders++;
        }
      } catch {
        pendingCount = null;
        invalidOrders = true;
      }
    }
    const terminal = !!bot.goalTerminal && pendingCount === 0;
    const runtime = options.runtimeStatus ?? (bot.status === 'running' ? 'paused' : bot.status);
    const status: ExactGoalProgress['status'] = invalidOrders
      ? 'attention'
      : pendingCount === null
        ? 'checking'
        : pendingCount > 0
          ? 'pending'
          : runtime === 'attention' || (bot.goalPostDeadline?.attention ?? state.attention).length
            ? 'attention'
            : options.now >= state.episode.endedAtMs && !terminal
              ? 'finalizing'
              : state.outcome !== 'active'
                ? state.outcome
                : runtime === 'running'
                  ? 'active'
                  : 'paused';
    const later = bot.goalPostDeadline;
    const actualHoldings = later?.holdings ?? state.holdings;
    const actualDeficit = later?.deficit ?? state.deficit;
    const paid = BigInt(state.feesPaidCodec) + BigInt(later?.feesPaidAfterDeadlineCodec ?? '0'),
      held = BigInt(actualHoldings.xorCodec);
    const remaining = BigInt(state.initial.xorCodec) - paid;
    const reserve = remaining <= 0n ? 0n : held < remaining ? held : remaining;
    const spent = [...state.settlements, ...(later?.settlements ?? [])].reduce(
      (sum, s) => sum + (s.success && s.fill.inputAsset === GOAL_EXACT_KUSD ? BigInt(s.fill.inputCodec) : 0n),
      0n
    );
    const vn = BigInt(state.latestValue.numerator),
      vd = BigInt(state.latestValue.denominator);
    const on = BigInt(state.openingValue.numerator),
      od = BigInt(state.openingValue.denominator);
    const idleNumerator =
      BigInt(state.initial.kusdCodec) * BigInt(state.lastMark.xorReserveCodec) +
      BigInt(state.initial.xorCodec) * BigInt(state.lastMark.kusdReserveCodec);
    const idleDenominator = BigInt(state.lastMark.kusdReserveCodec);
    const returnN = (vn * od - on * vd) * 100n,
      returnD = vd * on;
    return {
      kind: 'exact',
      accountingComplete: pendingCount === 0 && !invalidOrders,
      status,
      outcome: state.outcome,
      terminal,
      canResume: status === 'paused' && state.outcome === 'active' && options.now < state.episode.endedAtMs,
      pendingCount,
      expiredOrders,
      deadlineAtMs: state.episode.endedAtMs,
      valuedAtMs: state.lastMark.timestampMs,
      budgetCodec: state.initial.kusdCodec,
      spentKusdCodec: String(spent),
      retainedReserveCodec: String(reserve),
      feesPaidCodec: String(paid),
      holdings: { ...actualHoldings },
      value: state.latestValue,
      netReturnPercent: { numerator: String(returnN), denominator: String(returnD) },
      beatsIdleAfterFees: state.trades > 0 && vn * idleDenominator > idleNumerator * vd,
      tone: returnN < 0n ? 'negative' : returnN > 0n && status !== 'attention' ? 'positive' : '',
      trades: state.trades + (later?.tradesAfterDeadline ?? 0),
      ...(later
        ? {
            postDeadline: {
              fees: label(BigInt(later.feesPaidAfterDeadlineCodec), UNIT, 6),
              trades: later.tradesAfterDeadline,
              failures: later.failuresAfterDeadline,
            },
          }
        : {}),
      labels: {
        budget: label(BigInt(state.initial.kusdCodec), UNIT, 6),
        spent: label(spent, UNIT, 6),
        reserve: label(reserve, UNIT, 6),
        fees: label(paid, UNIT, 6),
        kusd: label(BigInt(actualHoldings.kusdCodec) - BigInt(actualDeficit.kusdCodec), UNIT, 6),
        xor: label(held - BigInt(actualDeficit.xorCodec), UNIT, 6),
        value: label(vn, vd * UNIT, 6),
        netReturn: label(returnN, returnD, 2, true, false),
      },
    };
  } catch {
    return { kind: 'invalid' };
  }
}

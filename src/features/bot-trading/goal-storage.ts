/** Atomic reducers for the opt-in exact ledger, sharing the existing bots/orders record. No signing or I/O here. */
import { u8aToHex } from '@polkadot/util';
import { sha256AsU8a } from '@polkadot/util-crypto';
import { assertGoalTerminalEvidence, readGoalTerminalEvidence, terminalGoalExactLedger } from './goal-terminal';
import { readGoalPersistedSigning } from './goal-signing-record';
import {
  assertGoalExpiryEvidence,
  consumeGoalExpiryEvidence,
  goalExpiryOrderDigest,
  readGoalExpiryEvidence,
} from './goal-expiry';
import { assertAllocations, pendingOrder } from './policy';
import { sameBotAccount } from './account-identity';
import {
  createGoalExactLedger,
  restoreGoalExactLedger,
  markGoalExactLedger,
  assessGoalExactFill,
  settleGoalExactLedger,
  settleGoalExactPostDeadline,
  restoreGoalExactPostDeadline,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  GOAL_EXACT_POLICY,
  type GoalExactLedgerState,
  type GoalExactFill,
  type GoalExactTerminalReceipt,
  type GoalExactPostDeadlineBoundary,
} from './goal-exact-ledger';
import {
  GOAL_EXECUTION_PROTOCOL,
  type GoalExecutionBinding,
  type GoalExecutionBot,
  type GoalExecutionExpected,
  type GoalExecutionAccountingExpected,
  type GoalExecutionControlExpected,
  type GoalExecutionOrder,
  type GoalExecutionFinalReceipt,
  type GoalExecutionStorage,
} from './goal-execution-types';
import type { BotDefinition, BotOrder, StrategyState } from './types';

export interface GoalStorageLedger {
  bots: BotDefinition[];
  orders: BotOrder[];
}
export type GoalStorageTransaction = <T>(write: boolean, action: (ledger: GoalStorageLedger) => T) => Promise<T>;
const fail = (message = 'bots.errors.storage'): never => {
  throw new Error(message);
};
function check(condition: unknown, message?: string): asserts condition {
  if (!condition) fail(message);
}

const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const U128 = (1n << 128n) - 1n;
const BINDING = ['protocol', 'execution', 'goalId', 'consentDigest', 'qualificationDigest', 'policyDigest'] as const;

/** Presence, including undefined or malformed markers, opts out of every legacy mutation path. */
export function hasGoalExecutionMarker(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    (Object.hasOwn(value, 'goalExecution') ||
      Object.hasOwn(value, 'exactGoalState') ||
      Object.hasOwn(value, 'goalControl') ||
      Object.hasOwn(value, 'goalSignal') ||
      Object.hasOwn(value, 'goalTerminal') ||
      Object.hasOwn(value, 'goalPostDeadline'))
  );
}
/** Generic paths must inspect both input and stored records so stripped markers cannot downgrade an epoch. */
export function assertLegacyGoalRecords(...values: unknown[]): void {
  if (values.some(hasGoalExecutionMarker)) fail('bots.errors.policy');
}
/** Snapshot before an IndexedDB await, without executing supplied getters or toJSON. */
export function copyGoalStorageData<T>(input: T): T {
  let nodes = 0,
    chars = 0;
  const visit = (v: unknown, d: number): unknown => {
    if (++nodes > 220000 || d > 24) return fail();
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : fail();
    if (typeof v === 'string') {
      chars += v.length;
      return v.length <= 100000 && chars <= 8_000_000 ? v : fail();
    }
    if (!v || typeof v !== 'object') return fail();
    const p = Object.getOwnPropertyDescriptors(v);
    const keys = Reflect.ownKeys(p);
    if (Array.isArray(v)) {
      if (Object.getPrototypeOf(v) !== Array.prototype || v.length > 10000 || keys.length !== v.length + 1)
        return fail();
      return Array.from({ length: v.length }, (_, i) => {
        const x = p[String(i)];
        if (!x || !('value' in x) || !x.enumerable) return fail();
        return visit(x.value, d + 1);
      });
    }
    if (![Object.prototype, null].includes(Object.getPrototypeOf(v)) || keys.length > 100) return fail();
    return Object.fromEntries(
      keys.map((k) => {
        if (typeof k !== 'string' || k.length > 128 || !('value' in p[k]) || !p[k].enumerable) return fail();
        return [k, visit(p[k].value, d + 1)];
      })
    );
  };
  return visit(input, 0) as T;
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
function fields(v: unknown, names: readonly string[]): void {
  check(v && typeof v === 'object' && !Array.isArray(v));
  const k = Object.keys(v as object);
  check(k.length === names.length && names.every((n) => k.includes(n)));
}
function canonical(v: unknown): string {
  return Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
}
const digest = (v: unknown) => u8aToHex(sha256AsU8a(new TextEncoder().encode(canonical(v)))).slice(2);
const id = (v: unknown) => check(typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,256}$/.test(v));
const sha = (v: unknown) => check(typeof v === 'string' && SHA.test(v));
const hash = (v: unknown) => check(typeof v === 'string' && HASH.test(v));
const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  check(Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max);
function amount(v: unknown, positive = false): bigint {
  check(typeof v === 'string' && /^(?:0|[1-9]\d{0,38})$/.test(v));
  const n = BigInt(v as string);
  check(n <= U128 && (!positive || n > 0n));
  return n;
}
function bindingPart(value: GoalExecutionBinding): GoalExecutionBinding {
  return Object.fromEntries(BINDING.map((k) => [k, value[k]])) as unknown as GoalExecutionBinding;
}
/** Strict immutable request/binding parser; digest presence is not proof of qualification or consent. */
export function readGoalExecutionBinding(raw: unknown): GoalExecutionBinding {
  const b = copyGoalStorageData(raw) as GoalExecutionBinding;
  fields(b, BINDING);
  check(b.protocol === GOAL_EXECUTION_PROTOCOL);
  id(b.goalId);
  fields(b.execution, ['protocol', 'expectedDenominator']);
  check(b.execution.protocol === 'finalized-xyk-native-fee-v1');
  amount(b.execution.expectedDenominator, true);
  for (const key of ['consentDigest', 'qualificationDigest', 'policyDigest'] as const) sha(b[key]);
  return freeze(b);
}
function project(bot: GoalExecutionBot, state: GoalExactLedgerState): void {
  const previousStatus = bot.status;
  bot.exactGoalState = state;
  const later = bot.goalPostDeadline;
  const holdings = later?.holdings ?? state.holdings;
  bot.portfolio = {
    initial: { [KUSD]: state.initial.kusdCodec, [XOR]: state.initial.xorCodec },
    holdings: { [KUSD]: holdings.kusdCodec, [XOR]: holdings.xorCodec },
    feesPaidCodec: String(BigInt(state.feesPaidCodec) + BigInt(later?.feesPaidAfterDeadlineCodec ?? '0')),
    trades: state.trades + (later?.tradesAfterDeadline ?? 0),
  };
  if (state.attention.length || later?.attention.length) bot.status = 'attention';
  else if (state.outcome !== 'active') bot.status = 'paused';
  if (previousStatus !== bot.status) advanceControl(bot);
}
/** Derive journal authority binding only from the bot's validated original deadline record. */
function postDeadlineBoundary(bot: GoalExecutionBot): GoalExactPostDeadlineBoundary {
  check(bot.goalTerminal);
  return {
    goalId: bot.goalExecution.goalId,
    ledgerStateSha256: bot.goalTerminal.ledgerStateSha256,
    evidenceSha256: bot.goalTerminal.evidence.evidenceSha256,
    blockHash: bot.goalTerminal.evidence.block.hash,
    blockNumber: bot.goalTerminal.evidence.block.height,
  };
}
function advanceControl(bot: GoalExecutionBot): void {
  check(bot.goalControl.revision < Number.MAX_SAFE_INTEGER);
  bot.goalControl.revision++;
}
/** Pure fixed-policy validator, including allocation mirrors; does not inspect a wallet or grant authority. */
export function readGoalExecutionBot(raw: unknown): GoalExecutionBot {
  const bot = copyGoalStorageData(raw) as GoalExecutionBot;
  check(bot && typeof bot === 'object' && !Object.hasOwn(bot, 'goalState'));
  const binding = readGoalExecutionBinding(bot.goalExecution);
  const state = restoreGoalExactLedger(bot.exactGoalState);
  if (Object.hasOwn(bot, 'goalTerminal')) {
    fields(bot.goalTerminal, ['evidence', 'ledgerStateSha256']);
    const terminal = readGoalTerminalEvidence(bot.goalTerminal!.evidence);
    check(
      bot.goalTerminal!.ledgerStateSha256 === state.stateSha256 &&
        terminal.request.goalId === state.goalId &&
        terminal.request.deadlineAtMs === state.episode.endedAtMs &&
        state.accountingAtMs === state.episode.endedAtMs &&
        canonical(terminal.mark) === canonical(state.lastMark) &&
        state.outcome !== 'active' &&
        bot.sessionExpiresAt === 0 &&
        bot.status !== 'running'
    );
  }
  if (Object.hasOwn(bot, 'goalPostDeadline')) {
    check(bot.goalTerminal);
    bot.goalPostDeadline = restoreGoalExactPostDeadline(state, postDeadlineBoundary(bot), bot.goalPostDeadline);
  }
  fields(bot.goalControl, ['revision']);
  integer(bot.goalControl.revision);
  fields(bot.goalSignal, ['completedAtMs']);
  check(bot.state && typeof bot.state === 'object');
  integer(bot.state.lastEvaluatedAt);
  integer(bot.state.lastTradeAt);
  check(bot.state.lastEvaluatedAt <= state.accountingAtMs && bot.state.lastTradeAt <= state.accountingAtMs);
  if (bot.goalSignal.completedAtMs !== null) {
    integer(bot.goalSignal.completedAtMs);
    check(
      bot.goalSignal.completedAtMs % 3_600_000 === 0 &&
        bot.goalSignal.completedAtMs >= Math.floor(state.episode.startedAtMs / 3_600_000) * 3_600_000 &&
        bot.goalSignal.completedAtMs <= state.accountingAtMs &&
        bot.state.lastEvaluatedAt >= state.episode.startedAtMs &&
        bot.state.lastEvaluatedAt >= bot.goalSignal.completedAtMs
    );
  } else check(bot.state.lastEvaluatedAt === 0);
  id(bot.id);
  check(typeof bot.account === 'string' && bot.account.length > 0 && bot.account.length <= 128);
  // No release/reset API exists yet: every exact goal retains its allocation, including ended goals.
  check(bot.version === 1 && bot.mode === 'live' && ['running', 'paused', 'attention'].includes(bot.status));
  check(
    bot.network === GOAL_EXACT_POLICY.genesisHash &&
      binding.goalId === state.goalId &&
      binding.execution.expectedDenominator === state.openingMark.denominator
  );
  for (const [asset, address, symbol] of [
    [bot.assetIn, KUSD, 'KUSD'],
    [bot.assetOut, XOR, 'XOR'],
    [bot.policy.feeAsset, XOR, 'XOR'],
  ] as const)
    check(asset.address === address && asset.symbol === symbol && asset.decimals === 18);
  check(
    bot.policy.slippagePercent === '0.5' &&
      bot.policy.maxPriceImpactPercent === '1' &&
      bot.policy.feeBudgetCodec === GOAL_EXACT_POLICY.initialFeeReserveCodec &&
      bot.policy.sessionDurationMs === GOAL_EXACT_POLICY.durationMs
  );
  fields(bot.policy.maxTradeCodec, [KUSD, XOR]);
  check(
    bot.policy.maxTradeCodec[KUSD] === state.limits.kusdCodec && bot.policy.maxTradeCodec[XOR] === state.limits.xorCodec
  );
  check(
    bot.goal?.targetReturnPercent === '5' &&
      bot.goal.maxLossPercent === '5' &&
      bot.goal.durationMs === GOAL_EXACT_POLICY.durationMs &&
      bot.goal.valuationAsset === 'output' &&
      bot.goal.lossMetric === 'drawdown'
  );
  integer(bot.sessionExpiresAt);
  check(bot.sessionExpiresAt <= state.episode.endedAtMs);
  const projected = copyGoalStorageData(bot);
  project(projected, state);
  check(canonical(projected.portfolio) === canonical(bot.portfolio));
  return freeze({ ...bot, goalExecution: binding, exactGoalState: state });
}
function orderFill(o: BotOrder): GoalExactFill {
  return {
    inputAsset: o.inputAsset,
    inputCodec: o.inputCodec,
    outputAsset: o.outputAsset,
    minimumOutputCodec: o.minOutputCodec,
    feeCeilingCodec: o.feeCodec,
  };
}
/** Parse a persisted exact order before returning it to a dispatcher; malformed markers cannot disappear. */
export function readGoalExecutionOrder(raw: unknown): GoalExecutionOrder {
  const o = copyGoalStorageData(raw) as GoalExecutionOrder;
  check(o && typeof o === 'object');
  fields(o, [
    'id',
    'botId',
    'account',
    'network',
    'intentId',
    'status',
    'inputAsset',
    'inputCodec',
    'outputAsset',
    'minOutputCodec',
    'feeAsset',
    'feeCodec',
    'createdAt',
    'goalExecution',
    ...[
      'txHash',
      'signedAtBlock',
      'outputCodec',
      'actualFeeCodec',
      'finalReceipt',
      'signingEvidence',
      'expiryEvidence',
    ].filter((k) => Object.hasOwn(o, k)),
  ]);
  const e = o.goalExecution;
  fields(e, [
    ...BINDING,
    'ledgerRevision',
    'ledgerStateSha256',
    'controlRevision',
    'quoteDigest',
    'envelopeDigest',
    'feePolicyDigest',
    'orderRevision',
    'phase',
    ...(Object.hasOwn(e, 'signedEnvelopeDigest') ? ['signedEnvelopeDigest'] : []),
  ]);
  readGoalExecutionBinding(bindingPart(e));
  for (const key of ['ledgerStateSha256', 'quoteDigest', 'envelopeDigest', 'feePolicyDigest'] as const) sha(e[key]);
  integer(e.ledgerRevision);
  integer(e.controlRevision);
  integer(e.orderRevision);
  for (const value of [o.id, o.botId, o.intentId]) id(value);
  check(
    typeof o.account === 'string' &&
      o.account.length > 0 &&
      o.account.length <= 128 &&
      o.network === GOAL_EXACT_POLICY.genesisHash
  );
  check(
    o.feeAsset === XOR &&
      ((o.inputAsset === KUSD && o.outputAsset === XOR) || (o.inputAsset === XOR && o.outputAsset === KUSD))
  );
  amount(o.inputCodec, true);
  amount(o.minOutputCodec, true);
  amount(o.feeCodec, true);
  integer(o.createdAt);
  const statuses = {
    reserved: 'reserved',
    signed: 'signed',
    submitted: 'submitted',
    cancelled: 'failed',
    expired: 'failed',
    'finalized-pending': o.status,
    accounted: o.status,
    'accounted-after-deadline': o.status,
  } as const;
  check(Object.hasOwn(statuses, e.phase) && o.status === statuses[e.phase]);
  if (!['accounted', 'accounted-after-deadline'].includes(e.phase))
    check(!Object.hasOwn(o, 'outputCodec') && !Object.hasOwn(o, 'actualFeeCodec'));
  if (e.phase === 'reserved' || e.phase === 'cancelled') {
    check(
      !Object.hasOwn(o, 'txHash') &&
        !Object.hasOwn(o, 'signedAtBlock') &&
        !Object.hasOwn(e, 'signedEnvelopeDigest') &&
        !Object.hasOwn(o, 'signingEvidence') &&
        !Object.hasOwn(o, 'finalReceipt')
    );
  } else {
    hash(o.txHash);
    integer(o.signedAtBlock, 0xffffffff);
    sha(e.signedEnvelopeDigest);
    if (Object.hasOwn(o, 'signingEvidence')) o.signingEvidence = readGoalPersistedSigning(o.signingEvidence);
  }
  if (e.phase === 'expired') {
    check(o.signingEvidence && o.expiryEvidence);
    const proof = readGoalExpiryEvidence(o.expiryEvidence);
    const { expiryEvidence: _expiry, ...previous } = o;
    previous.status = proof.orderPhase;
    previous.goalExecution = { ...e, phase: proof.orderPhase, orderRevision: proof.orderRevision };
    check(
      proof.orderId === o.id &&
        proof.txHash === o.txHash &&
        proof.signedEnvelopeDigest === e.signedEnvelopeDigest &&
        proof.orderRevision + 1 === e.orderRevision &&
        goalExpiryOrderDigest(previous) === proof.orderSha256
    );
  } else check(!Object.hasOwn(o, 'expiryEvidence'));
  if (e.phase === 'finalized-pending' || e.phase === 'accounted' || e.phase === 'accounted-after-deadline') {
    check(o.finalReceipt);
    fields(o.finalReceipt, [
      'receipt',
      'receiptDigest',
      'accounting',
      ...(Object.hasOwn(o.finalReceipt, 'appliedStateSha256') ? ['appliedStateSha256'] : []),
    ]);
    const r = readReceipt(o.finalReceipt.receipt);
    check(o.finalReceipt.receiptDigest === digest(r));
    bindReceipt(o, r);
    if (e.phase === 'finalized-pending')
      check(
        (o.status === 'signed' || o.status === 'submitted') &&
          o.finalReceipt.accounting === 'pending' &&
          !Object.hasOwn(o.finalReceipt, 'appliedStateSha256')
      );
    else {
      check(
        o.status === (r.success ? 'confirmed' : 'failed') &&
          o.finalReceipt.accounting === (e.phase === 'accounted' ? 'applied' : 'applied-after-deadline') &&
          o.outputCodec === r.outputCodec &&
          o.actualFeeCodec === r.actualFeeCodec
      );
      sha(o.finalReceipt.appliedStateSha256);
    }
  } else check(!Object.hasOwn(o, 'finalReceipt'));
  return o;
}
const readOrder = readGoalExecutionOrder;
/** Finalized economic facts are retained even when their values breach an earlier estimate. */
function readReceipt(raw: unknown): GoalExecutionFinalReceipt {
  const r = copyGoalStorageData(raw) as GoalExecutionFinalReceipt;
  fields(r, [
    'goalId',
    'orderId',
    'account',
    'network',
    'txHash',
    'blockHash',
    'blockNumber',
    'extrinsicIndex',
    'success',
    'outputCodec',
    'actualFeeCodec',
    'evidenceDigest',
  ]);
  id(r.goalId);
  id(r.orderId);
  check(
    typeof r.account === 'string' &&
      r.account.length > 0 &&
      r.account.length <= 128 &&
      r.network === GOAL_EXACT_POLICY.genesisHash
  );
  hash(r.txHash);
  hash(r.blockHash);
  sha(r.evidenceDigest);
  integer(r.blockNumber, 0xffffffff);
  check(r.blockNumber > 0 && r.blockHash !== r.network);
  integer(r.extrinsicIndex, 0xffffffff);
  check(typeof r.success === 'boolean');
  amount(r.outputCodec);
  amount(r.actualFeeCodec);
  check(r.success || r.outputCodec === '0');
  return r;
}
function bindReceipt(o: GoalExecutionOrder, r: GoalExecutionFinalReceipt) {
  check(
    r.goalId === o.goalExecution.goalId &&
      r.orderId === o.id &&
      r.account === o.account &&
      r.network === o.network &&
      r.txHash === o.txHash,
    'bots.errors.receipt'
  );
}
function storedBot(ledger: GoalStorageLedger, id: string): GoalExecutionBot {
  const b = ledger.bots.find((b) => b.id === id);
  if (!b) return fail();
  return copyGoalStorageData(readGoalExecutionBot(b));
}
function storedOrder(ledger: GoalStorageLedger, id: string): GoalExecutionOrder {
  const o = ledger.orders.find((o) => o.id === id);
  return o ? readOrder(o) : fail();
}
function putBot(l: GoalStorageLedger, b: GoalExecutionBot) {
  const i = l.bots.findIndex((v) => v.id === b.id);
  check(i >= 0);
  l.bots[i] = b;
}
function putOrder(l: GoalStorageLedger, o: GoalExecutionOrder) {
  const i = l.orders.findIndex((v) => v.id === o.id);
  check(i >= 0);
  l.orders[i] = o;
}
function expectedAccounting(bot: GoalExecutionBot, e: GoalExecutionAccountingExpected) {
  fields(e, ['goalId', 'revision', 'stateSha256']);
  check(
    e.goalId === bot.goalExecution.goalId &&
      e.revision === bot.exactGoalState.revision &&
      e.stateSha256 === bot.exactGoalState.stateSha256,
    'bots.errors.storage'
  );
}
function expectedControl(bot: GoalExecutionBot, e: GoalExecutionControlExpected) {
  fields(e, ['goalId', 'controlRevision']);
  check(e.goalId === bot.goalExecution.goalId && e.controlRevision === bot.goalControl.revision, 'bots.errors.stale');
}
function expected(bot: GoalExecutionBot, e: GoalExecutionExpected) {
  fields(e, ['goalId', 'revision', 'stateSha256', 'controlRevision']);
  expectedAccounting(bot, { goalId: e.goalId, revision: e.revision, stateSha256: e.stateSha256 });
  expectedControl(bot, { goalId: e.goalId, controlRevision: e.controlRevision });
}
function bindOrder(bot: Pick<GoalExecutionBot, 'id' | 'account' | 'network' | 'goalExecution'>, o: GoalExecutionOrder) {
  check(
    o.botId === bot.id &&
      o.account === bot.account &&
      o.network === bot.network &&
      canonical(bindingPart(o.goalExecution)) === canonical(bot.goalExecution),
    'bots.errors.policy'
  );
}
/** Convert a retained actual receipt to exact effects, without assigning an inclusion timestamp or price. */
function orderSettlement(order: GoalExecutionOrder): GoalExactTerminalReceipt {
  check(order.finalReceipt);
  const receipt = order.finalReceipt.receipt;
  return {
    orderId: order.id,
    receipt: {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      extrinsicHash: receipt.txHash,
      extrinsicIndex: receipt.extrinsicIndex,
    },
    fill: orderFill(order),
    success: receipt.success,
    actualOutputCodec: receipt.outputCodec,
    actualFeeCodec: receipt.actualFeeCodec,
  };
}
/** A complete order snapshot must explain both the immutable deadline ledger and every later effect exactly once. */
export function assertGoalOrderAccounting(rawBot: GoalExecutionBot, rawOrders: readonly GoalExecutionOrder[]): void {
  const bot = readGoalExecutionBot(rawBot);
  const orders = rawOrders.map(readOrder);
  check(new Set(orders.map((o) => o.id)).size === orders.length, 'bots.errors.receipt');
  const before = bot.exactGoalState.settlements,
    after = bot.goalPostDeadline?.settlements ?? [];
  const beforeById = new Map(before.map((entry) => [entry.orderId, entry])),
    afterById = new Map(after.map((entry) => [entry.orderId, entry])),
    ordersById = new Map(orders.map((order) => [order.id, order]));
  const matches = (order: GoalExecutionOrder, entry: GoalExactTerminalReceipt) =>
    canonical(orderSettlement(order)) ===
    canonical({
      orderId: entry.orderId,
      receipt: entry.receipt,
      fill: entry.fill,
      success: entry.success,
      actualOutputCodec: entry.actualOutputCodec,
      actualFeeCodec: entry.actualFeeCodec,
    });
  for (const order of orders) {
    bindOrder(bot, order);
    if (bot.goalTerminal)
      check(
        ['cancelled', 'expired', 'accounted', 'accounted-after-deadline'].includes(order.goalExecution.phase),
        'bots.errors.pending'
      );
    if (order.goalExecution.phase === 'accounted') {
      const entry = beforeById.get(order.id);
      check(entry && matches(order, entry), 'bots.errors.receipt');
    }
    if (order.goalExecution.phase === 'accounted-after-deadline') {
      const entry = afterById.get(order.id);
      check(
        bot.goalPostDeadline &&
          order.finalReceipt!.appliedStateSha256 === bot.goalPostDeadline.journalSha256 &&
          entry &&
          matches(order, entry),
        'bots.errors.receipt'
      );
    }
  }
  for (const [entries, phase] of [
    [before, 'accounted'],
    [after, 'accounted-after-deadline'],
  ] as const) {
    for (const entry of entries) {
      const order = ordersById.get(entry.orderId);
      check(order && order.goalExecution.phase === phase && matches(order, entry), 'bots.errors.receipt');
    }
  }
}
/** An unaccounted receipt or deficit blocks this whole account, including legacy allocation/reservation. */
export function assertGoalAccountClear(l: GoalStorageLedger, account: string, network: string): void {
  for (const b of l.bots.filter((b) => sameBotAccount(b.account, account) && b.network === network && hasGoalExecutionMarker(b))) {
    const bot = readGoalExecutionBot(b),
      deficit = bot.goalPostDeadline?.deficit ?? bot.exactGoalState.deficit;
    if (deficit.kusdCodec !== '0' || deficit.xorCodec !== '0') fail('bots.errors.balance');
    assertGoalOrderAccounting(bot, l.orders.filter((o) => o.botId === bot.id) as GoalExecutionOrder[]);
  }
  for (const raw of l.orders.filter(
    (o) => sameBotAccount(o.account, account) && o.network === network && hasGoalExecutionMarker(o)
  )) {
    const o = readOrder(raw);
    if (o.goalExecution.phase === 'finalized-pending') fail('bots.errors.pending');
  }
}
function noPending(l: GoalStorageLedger, account: string, network: string) {
  check(
    !l.orders.some((o) => sameBotAccount(o.account, account) && o.network === network && pendingOrder(o)),
    'bots.errors.pending'
  );
}
function guardInput<T extends { assertCurrent(): void }>(
  raw: T
): { data: Omit<T, 'assertCurrent'>; guard: () => void } {
  check(raw && typeof raw === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(raw)));
  const p = Object.getOwnPropertyDescriptors(raw);
  const f = p.assertCurrent;
  check(f && 'value' in f && typeof f.value === 'function');
  const assertCurrent = f.value as () => unknown;
  const entries = Reflect.ownKeys(p)
    .filter((k) => k !== 'assertCurrent')
    .map((k) => {
      check(typeof k === 'string' && 'value' in p[k as string] && p[k as string].enumerable);
      return [k, p[k as string].value];
    });
  const data = copyGoalStorageData(Object.fromEntries(entries)) as Omit<T, 'assertCurrent'>;
  return {
    data,
    guard: () => {
      const returned: unknown = assertCurrent();
      if (returned !== undefined) {
        // Invalid async hooks must fail synchronously without leaving an unhandled rejection.
        void Promise.resolve(returned).catch(() => undefined);
        fail('bots.errors.stale');
      }
    },
  };
}
function freshAt(now: () => number, at: number) {
  const current = now();
  integer(current);
  integer(at);
  check(at <= current && current - at < 5000, 'bots.errors.stale');
}

/** Accept deterministic completed-hour state without letting a decision invent a finalized fill. */
function signalState(bot: GoalExecutionBot, next: StrategyState, completedAtMs: number, at: number): void {
  const keys = ['lastEvaluatedAt', 'lastTradeAt', 'previousSignal', 'lastRuleObservationAt'];
  check(next && typeof next === 'object' && Object.keys(next).every((key) => keys.includes(key)));
  check(next.lastEvaluatedAt === at && next.lastEvaluatedAt >= bot.state.lastEvaluatedAt);
  check(next.lastTradeAt === bot.state.lastTradeAt);
  check(bot.strategy.kind !== 'ai' && bot.strategy.signalTiming !== 'live-price', 'bots.errors.strategy');
  if (Object.hasOwn(next, 'previousSignal')) {
    check(bot.strategy.kind === 'sma' && [-1, 0, 1].includes(next.previousSignal!), 'bots.errors.strategy');
  } else check(bot.state.previousSignal === undefined, 'bots.errors.strategy');
  if (Object.hasOwn(next, 'lastRuleObservationAt')) {
    integer(next.lastRuleObservationAt);
    check(
      bot.strategy.kind === 'rules' &&
        next.lastRuleObservationAt! <= completedAtMs &&
        next.lastRuleObservationAt! >= (bot.state.lastRuleObservationAt ?? 0) &&
        next.lastRuleObservationAt! % 3_600_000 === 0,
      'bots.errors.strategy'
    );
  } else check(bot.state.lastRuleObservationAt === undefined, 'bots.errors.strategy');
}
function accountAllocation(l: GoalStorageLedger, bot: BotDefinition, balances: Record<string, string>) {
  for (const v of Object.values(balances)) amount(v);
  assertAllocations(
    l.bots.filter((b) => sameBotAccount(b.account, bot.account) && b.network === bot.network),
    balances
  );
}

/** Bind synchronous exact reducers to the existing one-record IndexedDB transaction corridor. */
export function createGoalStorage(transact: GoalStorageTransaction, now: () => number): GoalExecutionStorage {
  return {
    initialize: async (raw) => {
      const { data: r, guard } = guardInput(raw);
      return transact(true, (l) => {
        guard();
        fields(r, ['bot', 'config', 'openingMark', 'balances']);
        check(
          !Object.hasOwn(r.bot, 'exactGoalState') &&
            !Object.hasOwn(r.bot, 'goalState') &&
            !Object.hasOwn(r.bot, 'goalControl') &&
            !Object.hasOwn(r.bot, 'goalSignal') &&
            !Object.hasOwn(r.bot, 'goalTerminal') &&
            !Object.hasOwn(r.bot, 'goalPostDeadline')
        );
        const binding = readGoalExecutionBinding(r.bot.goalExecution);
        check(
          !l.bots.some(
            (b) =>
              b.id === r.bot.id ||
              (hasGoalExecutionMarker(b) &&
                readGoalExecutionBinding((b as GoalExecutionBot).goalExecution).goalId === binding.goalId)
          ),
          'bots.errors.policy'
        );
        assertGoalAccountClear(l, r.bot.account, r.bot.network);
        noPending(l, r.bot.account, r.bot.network);
        fields(r.config, ['goalId', 'initialKusdCodec', 'maxTradeKusdCodec', 'maxTradeXorCodec']);
        check(r.config.goalId === binding.goalId);
        fields(r.bot.state, ['lastEvaluatedAt', 'lastTradeAt']);
        check(r.bot.state.lastEvaluatedAt === 0 && r.bot.state.lastTradeAt === 0, 'bots.errors.strategy');
        const startedAtMs = now();
        integer(startedAtMs);
        const state = createGoalExactLedger({ ...r.config, startedAtMs }, r.openingMark);
        const bot = {
          ...r.bot,
          status: 'paused' as const,
          sessionExpiresAt: 0,
          goalControl: { revision: 0 },
          goalSignal: { completedAtMs: null },
          exactGoalState: state,
        };
        const valid = copyGoalStorageData(readGoalExecutionBot(bot));
        l.bots.push(valid);
        accountAllocation(l, valid, r.balances);
        guard();
        return freeze(copyGoalStorageData(valid));
      });
    },
    terminal: async (raw) => {
      // Preserve the original capability object while copying all caller-controlled CAS fields.
      check(raw && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype);
      const own = Object.getOwnPropertyDescriptors(raw);
      check(
        Reflect.ownKeys(own).length === 3 &&
          ['botId', 'expected', 'evidence'].every((k) => own[k]?.enumerable && 'value' in own[k])
      );
      const evidence = own.evidence.value as Parameters<typeof assertGoalTerminalEvidence>[0];
      const r = copyGoalStorageData({ botId: own.botId.value, expected: own.expected.value }) as {
        botId: string;
        expected: GoalExecutionExpected;
      };
      assertGoalTerminalEvidence(evidence);
      return transact(true, (l) => {
        assertGoalTerminalEvidence(evidence);
        const b = storedBot(l, r.botId);
        expected(b, r.expected);
        check(now() >= b.exactGoalState.episode.endedAtMs, 'bots.errors.stale');
        // All orders are read inside this transaction; the caller cannot omit a pending receipt.
        const pendingBefore: GoalExecutionOrder[] = [],
          pendingAfter: GoalExecutionOrder[] = [];
        const allOrders = l.orders.filter((o) => o.botId === b.id).map(readOrder);
        for (const order of allOrders) {
          bindOrder(b, order);
          check(
            ['cancelled', 'expired', 'accounted', 'accounted-after-deadline', 'finalized-pending'].includes(
              order.goalExecution.phase
            ),
            'bots.errors.pending'
          );
          if (!order.finalReceipt) continue;
          const receipt = order.finalReceipt.receipt;
          if (receipt.blockNumber === evidence.block.height)
            check(receipt.blockHash === evidence.block.hash, 'bots.errors.receipt');
          if (receipt.blockNumber === evidence.successor.height)
            check(receipt.blockHash === evidence.successor.hash, 'bots.errors.receipt');
          if (order.goalExecution.phase === 'accounted')
            check(receipt.blockNumber <= evidence.block.height, 'bots.errors.receipt');
          if (order.goalExecution.phase === 'accounted-after-deadline')
            check(receipt.blockNumber > evidence.block.height, 'bots.errors.receipt');
          if (order.goalExecution.phase === 'finalized-pending')
            (receipt.blockNumber <= evidence.block.height ? pendingBefore : pendingAfter).push(order);
        }
        if (b.goalTerminal) {
          check(!pendingBefore.length && !pendingAfter.length, 'bots.errors.pending');
          assertGoalOrderAccounting(b, allOrders);
          check(
            evidence.request.goalId === b.goalExecution.goalId &&
              evidence.request.deadlineAtMs === b.exactGoalState.episode.endedAtMs &&
              canonical(b.goalTerminal.evidence.mark) === canonical(evidence.mark) &&
              canonical(b.goalTerminal.evidence.block) === canonical(evidence.block) &&
              canonical(b.goalTerminal.evidence.successor) === canonical(evidence.successor)
          );
          return freeze(copyGoalStorageData(b));
        }
        // Existing accounting belongs to the predeadline ledger; postdeadline journals are created only here.
        assertGoalOrderAccounting(b, allOrders);
        const position = (a: GoalExecutionOrder, b: GoalExecutionOrder) =>
          a.finalReceipt!.receipt.blockNumber - b.finalReceipt!.receipt.blockNumber ||
          a.finalReceipt!.receipt.extrinsicIndex - b.finalReceipt!.receipt.extrinsicIndex;
        pendingBefore.sort(position);
        pendingAfter.sort(position);
        const state = terminalGoalExactLedger(b.exactGoalState, evidence, pendingBefore.map(orderSettlement));
        b.sessionExpiresAt = 0;
        b.goalTerminal = { evidence: readGoalTerminalEvidence(evidence), ledgerStateSha256: state.stateSha256 };
        if (pendingAfter.length)
          b.goalPostDeadline = settleGoalExactPostDeadline(
            state,
            postDeadlineBoundary(b),
            pendingAfter.map(orderSettlement)
          );
        project(b, state);
        for (const order of [...pendingBefore, ...pendingAfter]) {
          const receipt = order.finalReceipt!.receipt;
          const later = receipt.blockNumber > evidence.block.height;
          order.status = receipt.success ? 'confirmed' : 'failed';
          order.outputCodec = receipt.outputCodec;
          order.actualFeeCodec = receipt.actualFeeCodec;
          order.goalExecution.phase = later ? 'accounted-after-deadline' : 'accounted';
          order.goalExecution.orderRevision++;
          order.finalReceipt!.accounting = later ? 'applied-after-deadline' : 'applied';
          order.finalReceipt!.appliedStateSha256 = later ? b.goalPostDeadline!.journalSha256 : state.stateSha256;
          if (receipt.success && !later) b.state.lastTradeAt = evidence.request.deadlineAtMs;
          putOrder(l, readOrder(order));
        }
        assertGoalOrderAccounting(b, l.orders.filter((o) => o.botId === b.id) as GoalExecutionOrder[]);
        putBot(l, b);
        assertGoalTerminalEvidence(evidence);
        return readGoalExecutionBot(b);
      });
    },
    observe: async (raw) => {
      const { data: r, guard } = guardInput(raw);
      return transact(true, (l) => {
        guard();
        fields(r, ['botId', 'expected', 'accountingAtMs', 'mark']);
        freshAt(now, r.accountingAtMs);
        const b = storedBot(l, r.botId);
        expected(b, r.expected);
        check(!b.goalTerminal, 'bots.errors.goalComplete');
        check(
          !l.orders.some(
            (o) =>
              o.botId === b.id && hasGoalExecutionMarker(o) && readOrder(o).goalExecution.phase === 'finalized-pending'
          ),
          'bots.errors.pending'
        );
        project(
          b,
          markGoalExactLedger(b.exactGoalState, {
            expectedRevision: r.expected.revision,
            accountingAtMs: r.accountingAtMs,
            mark: r.mark,
          })
        );
        putBot(l, b);
        guard();
        return freeze(copyGoalStorageData(b));
      });
    },
    recordSignal: async (raw) => {
      const { data: r, guard } = guardInput(raw);
      return transact(true, (l) => {
        guard();
        fields(r, [
          'botId',
          'expected',
          'accountingAtMs',
          'mark',
          'expectedCompletedAtMs',
          'completedAtMs',
          'strategyState',
        ]);
        freshAt(now, r.accountingAtMs);
        const b = storedBot(l, r.botId);
        expected(b, r.expected);
        check(r.expectedCompletedAtMs === b.goalSignal.completedAtMs, 'bots.errors.stale');
        integer(r.completedAtMs);
        check(
          r.completedAtMs === Math.floor(r.accountingAtMs / 3_600_000) * 3_600_000 &&
            r.completedAtMs >= Math.floor(b.exactGoalState.episode.startedAtMs / 3_600_000) * 3_600_000 &&
            (b.goalSignal.completedAtMs === null || r.completedAtMs > b.goalSignal.completedAtMs),
          'bots.errors.stale'
        );
        check(b.status === 'running' && now() < b.sessionExpiresAt, 'bots.errors.session');
        assertGoalAccountClear(l, b.account, b.network);
        noPending(l, b.account, b.network);
        signalState(b, r.strategyState, r.completedAtMs, r.accountingAtMs);
        project(
          b,
          markGoalExactLedger(b.exactGoalState, {
            expectedRevision: r.expected.revision,
            accountingAtMs: r.accountingAtMs,
            mark: r.mark,
          })
        );
        b.state = r.strategyState;
        b.goalSignal.completedAtMs = r.completedAtMs;
        putBot(l, b);
        guard();
        return freeze(copyGoalStorageData(b));
      });
    },
    reserve: async (raw) => {
      const { data: r, guard } = guardInput(raw);
      return transact(true, (l) => {
        guard();
        fields(r, ['botId', 'expected', 'accountingAtMs', 'mark', 'order', 'balances']);
        freshAt(now, r.accountingAtMs);
        const b = storedBot(l, r.botId);
        expected(b, r.expected);
        const o = readOrder(r.order);
        bindOrder(b, o);
        check(
          o.goalExecution.phase === 'reserved' &&
            o.goalExecution.orderRevision === 0 &&
            o.goalExecution.ledgerRevision === r.expected.revision &&
            o.goalExecution.controlRevision === r.expected.controlRevision &&
            o.goalExecution.ledgerStateSha256 === r.expected.stateSha256,
          'bots.errors.policy'
        );
        check(b.status === 'running' && now() < b.sessionExpiresAt, 'bots.errors.session');
        assertGoalAccountClear(l, b.account, b.network);
        noPending(l, b.account, b.network);
        check(!l.orders.some((v) => v.id === o.id || v.intentId === o.intentId), 'bots.errors.pending');
        accountAllocation(l, b, r.balances);
        const admission = assessGoalExactFill(b.exactGoalState, {
          expectedRevision: r.expected.revision,
          accountingAtMs: r.accountingAtMs,
          mark: r.mark,
          fill: orderFill(o),
        });
        project(b, admission.state);
        putBot(l, b);
        guard();
        if (admission.rejection) return freeze({ bot: copyGoalStorageData(b), rejection: admission.rejection });
        l.orders.push(o);
        return freeze({ bot: copyGoalStorageData(b), order: copyGoalStorageData(o) });
      });
    },
    sign: async (raw) => {
      const r = copyGoalStorageData(raw);
      const verifier = r.signingEvidence ? (await import('./goal-mortality')).verifyGoalPersistedSigning : undefined;
      return transact(true, (l) => {
        fields(r, [
          'orderId',
          'expectedOrderRevision',
          'txHash',
          'signedAtBlock',
          'envelopeDigest',
          'signedEnvelopeDigest',
          ...(Object.hasOwn(r, 'signingEvidence') ? ['signingEvidence'] : []),
        ]);
        const o = storedOrder(l, r.orderId);
        const b = storedBot(l, o.botId);
        bindOrder(b, o);
        check(o.goalExecution.phase === 'reserved' && o.goalExecution.orderRevision === r.expectedOrderRevision);
        hash(r.txHash);
        sha(r.signedEnvelopeDigest);
        integer(r.signedAtBlock, 0xffffffff);
        check(r.signedAtBlock > 0 && r.envelopeDigest === o.goalExecution.envelopeDigest);
        check(!l.orders.some((v) => v.id !== o.id && v.txHash === r.txHash));
        o.txHash = r.txHash;
        o.signedAtBlock = r.signedAtBlock;
        o.status = 'signed';
        o.goalExecution.signedEnvelopeDigest = r.signedEnvelopeDigest;
        if (r.signingEvidence) {
          verifier!(r.signingEvidence, {
            account: o.account,
            network: o.network,
            txHash: r.txHash,
            signedEnvelopeDigest: r.signedEnvelopeDigest,
          });
          o.signingEvidence = readGoalPersistedSigning(r.signingEvidence);
        }
        o.goalExecution.phase = 'signed';
        o.goalExecution.orderRevision++;
        putOrder(l, o);
        return freeze(copyGoalStorageData(o));
      });
    },
    submit: async (raw) => {
      const { data: r, guard } = guardInput(raw);
      return transact(true, (l) => {
        guard();
        fields(r, ['orderId', 'expected', 'expectedOrderRevision', 'txHash']);
        const o = storedOrder(l, r.orderId);
        const b = storedBot(l, o.botId);
        bindOrder(b, o);
        expected(b, r.expected);
        const currentTime = now();
        integer(currentTime);
        check(currentTime >= b.exactGoalState.accountingAtMs, 'bots.errors.stale');
        check(
          o.goalExecution.phase === 'signed' &&
            o.goalExecution.orderRevision === r.expectedOrderRevision &&
            o.goalExecution.controlRevision === b.goalControl.revision &&
            o.txHash === r.txHash
        );
        check(
          b.status === 'running' &&
            currentTime < b.sessionExpiresAt &&
            currentTime < b.exactGoalState.episode.endedAtMs &&
            b.exactGoalState.outcome === 'active' &&
            !b.exactGoalState.attention.length,
          'bots.errors.session'
        );
        assertGoalAccountClear(l, b.account, b.network);
        check(
          !l.orders.some((v) => v.id !== o.id && sameBotAccount(v.account, b.account) && v.network === b.network && pendingOrder(v)),
          'bots.errors.pending'
        );
        o.status = 'submitted';
        o.goalExecution.phase = 'submitted';
        o.goalExecution.orderRevision++;
        putOrder(l, o);
        guard();
        return freeze(copyGoalStorageData(o));
      });
    },
    cancel: async (raw) => {
      const r = copyGoalStorageData(raw);
      return transact(true, (l) => {
        fields(r, ['orderId', 'expectedOrderRevision']);
        const o = storedOrder(l, r.orderId);
        bindOrder(storedBot(l, o.botId), o);
        check(
          o.goalExecution.phase === 'reserved' && o.goalExecution.orderRevision === r.expectedOrderRevision && !o.txHash
        );
        o.status = 'failed';
        o.goalExecution.phase = 'cancelled';
        o.goalExecution.orderRevision++;
        putOrder(l, o);
        return freeze(copyGoalStorageData(o));
      });
    },
    expire: async (raw) => {
      check(raw && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype);
      const own = Object.getOwnPropertyDescriptors(raw);
      check(
        Reflect.ownKeys(own).length === 3 &&
          ['orderId', 'expected', 'evidence'].every((key) => own[key]?.enumerable && 'value' in own[key])
      );
      const evidence = own.evidence.value as Parameters<typeof assertGoalExpiryEvidence>[0];
      const r = copyGoalStorageData({ orderId: own.orderId.value, expected: own.expected.value }) as {
        orderId: string;
        expected: GoalExecutionControlExpected;
      };
      return transact(true, (l) => {
        const o = storedOrder(l, r.orderId),
          b = storedBot(l, o.botId);
        bindOrder(b, o);
        fields(r.expected, ['goalId', 'controlRevision']);
        check(r.expected.goalId === b.goalExecution.goalId && r.expected.controlRevision === b.goalControl.revision);
        check(['signed', 'submitted'].includes(o.goalExecution.phase) && o.signingEvidence && !o.finalReceipt);
        assertGoalExpiryEvidence(evidence, o, b.goalControl.revision);
        const retained = readGoalExpiryEvidence(evidence);
        consumeGoalExpiryEvidence(evidence, o, b.goalControl.revision);
        o.status = 'failed';
        o.goalExecution.phase = 'expired';
        o.goalExecution.orderRevision++;
        o.expiryEvidence = retained;
        putOrder(l, readOrder(o));
        return freeze(copyGoalStorageData(o));
      });
    },
    persistFinalReceipt: async (raw) => {
      const r = copyGoalStorageData(raw);
      return transact(true, (l) => {
        fields(r, ['orderId', 'receipt']);
        const o = storedOrder(l, r.orderId);
        const receipt = readReceipt(r.receipt);
        bindReceipt(o, receipt);
        // Do not require a usable exact state or fresh mark to preserve already-finalized evidence.
        const b = l.bots.find((b) => b.id === o.botId) as GoalExecutionBot | undefined;
        check(b);
        const binding = readGoalExecutionBinding(b!.goalExecution);
        bindOrder({ ...b!, goalExecution: binding }, o);
        const receiptDigest = digest(receipt);
        if (o.finalReceipt) {
          check(o.finalReceipt.receiptDigest === receiptDigest, 'bots.errors.receipt');
          return freeze(copyGoalStorageData(o));
        }
        check(o.goalExecution.phase === 'signed' || o.goalExecution.phase === 'submitted', 'bots.errors.receipt');
        for (const other of l.orders) {
          if (!hasGoalExecutionMarker(other) || other.id === o.id) continue;
          const old = readOrder(other).finalReceipt?.receipt;
          if (old)
            check(
              old.txHash !== receipt.txHash &&
                (old.blockHash !== receipt.blockHash || old.extrinsicIndex !== receipt.extrinsicIndex),
              'bots.errors.receipt'
            );
        }
        o.finalReceipt = { receipt, receiptDigest, accounting: 'pending' };
        o.goalExecution.phase = 'finalized-pending';
        o.goalExecution.orderRevision++;
        putOrder(l, o);
        // The pending receipt blocks the account without revoking an unchanged authorized session.
        return freeze(copyGoalStorageData(o));
      });
    },
    applyReceipt: async (raw) => {
      const { data: r, guard } = guardInput(raw);
      return transact(true, (l) => {
        guard();
        fields(r, ['botId', 'expected', 'accountingAtMs', 'mark', 'orderId']);
        const o = storedOrder(l, r.orderId);
        const b = storedBot(l, r.botId);
        bindOrder(b, o);
        check(o.finalReceipt, 'bots.errors.receipt');
        if (o.goalExecution.phase === 'accounted') return freeze({ bot: b, order: o, duplicate: true });
        expectedAccounting(b, r.expected);
        freshAt(now, r.accountingAtMs);
        check(
          r.accountingAtMs < b.exactGoalState.episode.endedAtMs && now() < b.exactGoalState.episode.endedAtMs,
          'bots.errors.goalComplete'
        );
        check(o.goalExecution.phase === 'finalized-pending');
        const receipt = o.finalReceipt!.receipt;
        const result = settleGoalExactLedger(b.exactGoalState, {
          expectedRevision: b.exactGoalState.revision,
          accountingAtMs: r.accountingAtMs,
          mark: r.mark,
          orderId: o.id,
          receipt: {
            blockHash: receipt.blockHash,
            blockNumber: receipt.blockNumber,
            extrinsicHash: receipt.txHash,
            extrinsicIndex: receipt.extrinsicIndex,
          },
          fill: orderFill(o),
          success: receipt.success,
          actualOutputCodec: receipt.outputCodec,
          actualFeeCodec: receipt.actualFeeCodec,
        });
        project(b, result.state);
        if (receipt.success) b.state.lastTradeAt = r.accountingAtMs;
        o.status = receipt.success ? 'confirmed' : 'failed';
        o.outputCodec = receipt.outputCodec;
        o.actualFeeCodec = receipt.actualFeeCodec;
        o.goalExecution.phase = 'accounted';
        o.goalExecution.orderRevision++;
        o.finalReceipt!.accounting = 'applied';
        o.finalReceipt!.appliedStateSha256 = result.state.stateSha256;
        putBot(l, b);
        putOrder(l, o);
        guard();
        return freeze({ bot: copyGoalStorageData(b), order: copyGoalStorageData(o), duplicate: result.duplicate });
      });
    },
    pause: async (raw) => {
      const r = copyGoalStorageData(raw);
      return transact(true, (l) => {
        fields(r, ['botId', 'expected']);
        const b = storedBot(l, r.botId);
        expectedControl(b, r.expected);
        b.status = b.exactGoalState.attention.length || b.goalPostDeadline?.attention.length ? 'attention' : 'paused';
        b.sessionExpiresAt = 0;
        advanceControl(b);
        putBot(l, b);
        return freeze(copyGoalStorageData(b));
      });
    },
    resume: async (raw) => {
      const { data: r, guard } = guardInput(raw);
      return transact(true, (l) => {
        guard();
        fields(r, ['botId', 'expected', 'sessionExpiresAt', 'balances']);
        const b = storedBot(l, r.botId);
        expected(b, r.expected);
        const currentTime = now();
        integer(currentTime);
        check(currentTime >= b.exactGoalState.accountingAtMs, 'bots.errors.stale');
        check(
          b.exactGoalState.outcome === 'active' &&
            !b.exactGoalState.attention.length &&
            currentTime < b.exactGoalState.episode.endedAtMs,
          'bots.errors.goalComplete'
        );
        assertGoalAccountClear(l, b.account, b.network);
        noPending(l, b.account, b.network);
        integer(r.sessionExpiresAt);
        check(r.sessionExpiresAt > currentTime && r.sessionExpiresAt <= b.exactGoalState.episode.endedAtMs);
        b.status = 'running';
        b.sessionExpiresAt = r.sessionExpiresAt;
        advanceControl(b);
        putBot(l, b);
        accountAllocation(l, b, r.balances);
        guard();
        return freeze(copyGoalStorageData(b));
      });
    },
  };
}

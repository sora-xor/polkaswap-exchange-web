import {
  createGoalStorage,
  assertLegacyGoalRecords,
  assertGoalAccountClear,
  hasGoalExecutionMarker,
  readGoalExecutionBot,
  readGoalExecutionOrder,
} from './goal-storage';
import type { GoalExecutionStorage } from './goal-execution-types';
import { addCodec, codec, subtractCodec } from './amounts';
import { sameBotAccount } from './account-identity';
import { assertTradeFunds } from './allocation';
import { assertAllocations, consentIdentity, pendingOrder } from './policy';
import { validateBotGoalState } from './goals';
import {
  advanceDiscoveryCampaign,
  assertDiscoveryMarkLedger,
  closeDiscoveryCampaign,
  grantDiscoveryCampaign,
  validateDiscoveryCampaign,
  type DiscoveryCampaign,
  type DiscoveryCampaignMark,
} from './campaign';
import { FPNumber } from '@/lib/substrate/math';
import type { BotActivity, BotDefinition, BotGoal, BotGoalState, BotOrder } from './types';

export interface BotSettlement {
  success: boolean;
  outputCodec: string;
  actualFeeCodec: string;
  /** Independently read from a canonical finalized block, never a submit callback alone. */
  finalized?: NonNullable<BotOrder['finalized']> & { txHash: string; signedEnvelopeDigest: string };
  /** Only a locally proven pre-submit cancellation may release a signed reservation without a receipt. */
  unbroadcast?: true;
}
export interface BotStorage {
  listBots(): Promise<BotDefinition[]>;
  saveBot(bot: BotDefinition, options?: { resetGoal?: true }): Promise<void>;
  saveGoalProgress(id: string, goal: BotGoal, state: BotGoalState): Promise<boolean>;
  deleteBot(id: string): Promise<void>;
  listOrders(botId?: string): Promise<BotOrder[]>;
  allocate(bot: BotDefinition, balances: Record<string, string>): Promise<void>;
  reserve(order: BotOrder, balances: Record<string, string>): Promise<void>;
  markSigned(
    id: string,
    txHash: string,
    signedAtBlock: number,
    signedEnvelopeDigest?: string,
    signedCallHex?: string
  ): Promise<void>;
  markSubmitted(id: string): Promise<void>;
  /** Memory-only cancellation for a submitted order whose send call has provably not begun. */
  cancelUnbroadcastSubmitted?(id: string): Promise<void>;
  /** Synchronously revoke cancellation eligibility immediately before invoking send. */
  markBroadcastAttempted?(id: string): void;
  settle(id: string, settlement: BotSettlement): Promise<void>;
  stopBot(id: string): Promise<void>;
  /** Optional for test doubles; production storage writes the fixed set atomically with allocations. */
  createCampaign?(campaign: DiscoveryCampaign, bots: BotDefinition[], balances: Record<string, string>): Promise<void>;
  listCampaigns?(): Promise<DiscoveryCampaign[]>;
  grantCampaign?(id: string, now: number): Promise<DiscoveryCampaign>;
  pauseCampaign?(id: string): Promise<void>;
  closeCampaign?(id: string): Promise<void>;
  recordCampaignMark?(
    id: string,
    mark: DiscoveryCampaignMark,
    expectedPortfolios: Record<string, BotDefinition['portfolio']>,
    admissionOrderId?: string
  ): Promise<DiscoveryCampaign>;
}
interface Ledger {
  bots: BotDefinition[];
  orders: BotOrder[];
  campaigns?: DiscoveryCampaign[];
}
export type DiscoveryCampaignStorage = BotStorage &
  Required<
    Pick<
      BotStorage,
      'createCampaign' | 'listCampaigns' | 'grantCampaign' | 'pauseCampaign' | 'closeCampaign' | 'recordCampaignMark'
    >
  >;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Reject stale snapshots that would erase a drawdown goal's already observed high-water mark. */
function goalPeakRegresses(goal: BotGoal, previous: BotGoalState, next: BotGoalState): boolean {
  if (goal.lossMetric !== 'drawdown') return false;
  validateBotGoalState({ goal, goalState: previous });
  return new FPNumber(next.peakValue!, 36).lt(new FPNumber(previous.peakValue!, 36));
}

/** A resumed GO goal cannot replace its no-trade opening allocation with a later portfolio. */
function goalIdleOpeningChanges(goal: BotGoal, previous: BotGoalState, next: BotGoalState): boolean {
  return (
    goal.targetRequiresIdleOutperformance === true &&
    JSON.stringify(previous.idleHoldings) !== JSON.stringify(next.idleHoldings)
  );
}

/** A live GO target needs a real, finalized post-start fill in this bot's durable order ledger. */
function assertDurableTargetFill(ledger: Ledger, bot: BotDefinition): void {
  const state = bot.goalState;
  if (!bot.goal?.targetRequiresIdleOutperformance || state?.outcome !== 'target' || bot.mode !== 'live') return;
  if (
    !ledger.orders.some(
      (order) =>
        order.botId === bot.id &&
        sameBotAccount(order.account, bot.account) &&
        order.network === bot.network &&
        ((order.inputAsset === bot.assetIn.address && order.outputAsset === bot.assetOut.address) ||
          (order.inputAsset === bot.assetOut.address && order.outputAsset === bot.assetIn.address)) &&
        order.feeAsset === bot.policy.feeAsset.address &&
        order.status === 'confirmed' &&
        order.finalized !== undefined &&
        /^0x[0-9a-f]{64}$/i.test(order.txHash ?? '') &&
        /^[0-9a-f]{64}$/i.test(order.signedEnvelopeDigest ?? '') &&
        /^0x[0-9a-f]{64}$/i.test(order.finalized.blockHash) &&
        Number.isSafeInteger(order.finalized.blockNumber) &&
        order.finalized.blockNumber >= 0 &&
        Number.isSafeInteger(order.finalized.extrinsicIndex) &&
        order.finalized.extrinsicIndex >= 0 &&
        Number.isSafeInteger(order.createdAt) &&
        order.createdAt >= state.startedAt &&
        order.createdAt <= state.completedAt! &&
        codec(order.outputCodec ?? '0') > 0n
    )
  )
    throw new Error('bots.errors.goal');
}

/** Update only the matching goal epoch, preserving a concurrent stop/reset and all ledger holdings. */
export function recordGoalProgress(ledger: Ledger, id: string, goal: BotGoal, state: BotGoalState): boolean {
  const bot = ledger.bots.find((item) => item.id === id);
  assertLegacyGoalRecords(bot);
  if (!bot) return false;
  // An incoming target must also have a completed post-start fill in the stored ledger.
  validateBotGoalState({ ...bot, goal, goalState: state });
  assertDurableTargetFill(ledger, { ...bot, goal, goalState: state });
  if (
    !bot.goalState ||
    JSON.stringify(bot.goal) !== JSON.stringify(goal) ||
    bot.goalState.startedAt !== state.startedAt ||
    bot.goalState.baselineValue !== state.baselineValue
  )
    return false;
  if (goalPeakRegresses(goal, bot.goalState, state) || goalIdleOpeningChanges(goal, bot.goalState, state)) return false;
  if (bot.goalState.outcome !== 'active') return bot.goalState.outcome === state.outcome;
  bot.goalState = clone(state);
  if (state.outcome !== 'active') {
    if (!['idle', 'stopped'].includes(bot.status)) bot.status = 'paused';
    bot.activity.unshift({
      id: crypto.randomUUID(),
      timestamp: state.completedAt!,
      kind: 'status',
      message: `bots.goals.events.${state.outcome}`,
    });
    bot.activity = bot.activity.slice(0, 200);
  }
  return true;
}

/** Atomic, pure ledger reducer shared by IndexedDB transactions and deterministic unit tests. */
export function reserveOrder(ledger: Ledger, order: BotOrder, balances: Record<string, string>): void {
  assertLegacyGoalRecords(order);
  assertLegacyGoalRecords(ledger.bots.find((bot) => bot.id === order.botId));
  assertGoalAccountClear(ledger, order.account, order.network);
  if (
    ledger.orders.some(
      (item) =>
        item.id === order.id ||
        item.intentId === order.intentId ||
        (sameBotAccount(item.account, order.account) && item.network === order.network && pendingOrder(item))
    )
  ) {
    throw new Error('bots.errors.pending');
  }
  const bot = ledger.bots.find((item) => item.id === order.botId);
  if (
    !bot ||
    bot.mode !== 'live' ||
    bot.status !== 'running' ||
    !sameBotAccount(bot.account, order.account) ||
    bot.network !== order.network
  )
    throw new Error('bots.errors.session');
  if (bot.discoveryCampaignId) {
    const campaign = (ledger.campaigns ?? []).find((item) => item.id === bot.discoveryCampaignId);
    if (
      !campaign ||
      campaign.status !== 'running' ||
      !campaign.grant ||
      campaign.grant.expiresAt !== bot.sessionExpiresAt ||
      campaign.progress[bot.id]?.outcome !== 'active' ||
      campaign.consent[bot.id] !== consentIdentity(bot)
    )
      throw new Error('bots.errors.session');
  }
  if (
    ![
      [bot.assetIn.address, bot.assetOut.address],
      [bot.assetOut.address, bot.assetIn.address],
    ].some(([input, output]) => input === order.inputAsset && output === order.outputAsset) ||
    order.feeAsset !== bot.policy.feeAsset.address ||
    !codec(order.inputCodec) ||
    codec(order.inputCodec) > codec(bot.policy.maxTradeCodec[order.inputAsset] ?? '0')
  )
    throw new Error('bots.errors.policy');
  assertAllocations(
    ledger.bots.filter((item) => sameBotAccount(item.account, order.account) && item.network === order.network),
    balances
  );
  assertTradeFunds(bot, order.inputAsset, order.inputCodec, order.feeCodec);
  ledger.orders.push(clone(order));
}

/** Commit actual finalized proceeds once; failed extrinsics still debit the network fee. */
export function settleOrder(ledger: Ledger, id: string, result: BotSettlement): void {
  const order = ledger.orders.find((item) => item.id === id);
  if (!order) throw new Error('bots.errors.storage');
  assertLegacyGoalRecords(
    order,
    ledger.bots.find((bot) => bot.id === order.botId)
  );
  if (!pendingOrder(order)) return;
  const unbroadcast =
    result.unbroadcast === true &&
    order.status !== 'submitted' &&
    !result.success &&
    result.outputCodec === '0' &&
    result.actualFeeCodec === '0';
  if (order.signedEnvelopeDigest && !unbroadcast) {
    const proof = result.finalized;
    if (
      !proof ||
      proof.txHash !== order.txHash ||
      proof.signedEnvelopeDigest !== order.signedEnvelopeDigest ||
      !/^0x[0-9a-f]{64}$/i.test(proof.blockHash) ||
      !Number.isSafeInteger(proof.blockNumber) ||
      proof.blockNumber < 0 ||
      !Number.isSafeInteger(proof.extrinsicIndex) ||
      proof.extrinsicIndex < 0 ||
      ledger.orders.some(
        (item) =>
          item.id !== id &&
          item.network === order.network &&
          item.txHash === proof.txHash &&
          item.finalized !== undefined
      )
    )
      throw new Error('bots.errors.receipt');
  }
  const bot = ledger.bots.find((item) => item.id === order.botId);
  if (!bot) throw new Error('bots.errors.storage');
  const holdings = { ...bot.portfolio.holdings };
  if (result.success) {
    if (codec(result.outputCodec) < codec(order.minOutputCodec)) throw new Error('bots.errors.receipt');
    holdings[order.inputAsset] = subtractCodec(holdings[order.inputAsset] ?? '0', order.inputCodec);
    holdings[order.outputAsset] = addCodec(holdings[order.outputAsset] ?? '0', result.outputCodec);
  }
  // A finalized fee is a chain fact even when it exceeds this bot's XOR allocation.
  // Retain the shortfall explicitly instead of leaving the real order pending.
  const heldFee = codec(holdings[order.feeAsset] ?? '0');
  const actualFee = codec(result.actualFeeCodec);
  const feeDeficit = actualFee > heldFee ? actualFee - heldFee : 0n;
  holdings[order.feeAsset] = (heldFee > actualFee ? heldFee - actualFee : 0n).toString();
  bot.portfolio.holdings = holdings;
  if (feeDeficit > 0n)
    bot.portfolio.xorDeficitCodec = addCodec(bot.portfolio.xorDeficitCodec ?? '0', feeDeficit.toString());
  bot.portfolio.feesPaidCodec = addCodec(bot.portfolio.feesPaidCodec, result.actualFeeCodec);
  if (result.success) {
    bot.portfolio.trades++;
    bot.state.lastTradeAt = Date.now();
  }
  if (actualFee > codec(order.feeCodec) ||
      codec(bot.portfolio.feesPaidCodec) > codec(bot.policy.feeBudgetCodec) || feeDeficit > 0n)
    bot.status = 'attention';
  bot.activity.unshift({
    id: order.id,
    timestamp: Date.now(),
    kind: result.success ? 'trade' : unbroadcast ? 'status' : 'error',
    message: result.success
      ? 'bots.events.confirmed'
      : unbroadcast
        ? 'bots.events.sessionPaused'
        : 'bots.errors.transaction',
    txHash: order.txHash,
  });
  bot.activity = bot.activity.slice(0, 200);
  Object.assign(order, {
    outputCodec: result.outputCodec,
    actualFeeCodec: result.actualFeeCodec,
    status: result.success ? 'confirmed' : 'failed',
    ...(unbroadcast ? { unbroadcast: true } : {}),
    ...(result.finalized
      ? {
          finalized: {
            blockHash: result.finalized.blockHash,
            blockNumber: result.finalized.blockNumber,
            extrinsicIndex: result.finalized.extrinsicIndex,
          },
        }
      : {}),
  });
}

/** Release a submitted reservation only when the local executor still owns its pre-send ticket. */
export function cancelLocallyUnbroadcastSubmittedOrder(ledger: Ledger, id: string): void {
  const order = ledger.orders.find((item) => item.id === id);
  if (!order || order.status !== 'submitted') throw new Error('bots.errors.pending');
  order.status = 'signed';
  settleOrder(ledger, id, { success: false, outputCodec: '0', actualFeeCodec: '0', unbroadcast: true });
}

/** Retain durable live events when an earlier UI snapshot arrives after settlement. */
function mergeLiveActivity(existing: BotActivity[], incoming: BotActivity[]): BotActivity[] {
  const byId = new Map(incoming.map((event) => [event.id, clone(event)]));
  for (const event of existing) byId.set(event.id, clone(event));
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);
}

/** Merge a UI snapshot only after the authoritative portfolio and finalized orders still validate it. */
export function saveBotRecord(ledger: Ledger, bot: BotDefinition, options: { resetGoal?: true } = {}): void {
  assertLegacyGoalRecords(bot);
  const existing = ledger.bots.find((item) => item.id === bot.id);
  if (bot.discoveryCampaignId && !existing) throw new Error('bots.errors.policy');
  if (existing?.discoveryCampaignId && existing.discoveryCampaignId !== bot.discoveryCampaignId)
    throw new Error('bots.errors.policy');
  assertLegacyGoalRecords(existing);
  assertGoalAccountClear(ledger, bot.account, bot.network);
  validateBotGoalState(bot);
  const sameGoal = Boolean(existing?.goal && bot.goal && JSON.stringify(existing.goal) === JSON.stringify(bot.goal));
  const explicitReset = Boolean(
    options.resetGoal === true && sameGoal && existing && ['idle', 'stopped'].includes(existing.status) &&
      bot.status === 'idle' && !bot.goalState
  );
  if (options.resetGoal && !explicitReset) throw new Error('bots.errors.goal');
  // Terminal outcomes belong to the durable goal epoch. A delayed UI save must
  // not turn a completed target or loss back into an active goal.
  if (
    sameGoal &&
    existing?.goalState?.outcome !== undefined &&
    existing.goalState.outcome !== 'active' &&
    !explicitReset &&
    JSON.stringify(bot.goalState) !== JSON.stringify(existing.goalState)
  )
    throw new Error('bots.errors.goal');
  if (
    bot.goal &&
    bot.goalState &&
    existing?.goalState &&
    JSON.stringify(existing.goal) === JSON.stringify(bot.goal) &&
    existing.goalState.startedAt === bot.goalState.startedAt &&
    existing.goalState.baselineValue === bot.goalState.baselineValue &&
    (goalPeakRegresses(bot.goal, existing.goalState, bot.goalState) ||
      goalIdleOpeningChanges(bot.goal, existing.goalState, bot.goalState))
  )
    throw new Error('bots.errors.goal');
  if (existing?.mode === 'live' && !['idle', 'stopped'].includes(existing.status)) {
    // Persisting chart/signal state must not substitute a stale or invented portfolio for settled holdings.
    const next = clone(existing);
    next.activity = mergeLiveActivity(existing.activity, bot.activity);
    // Only settlement may advance the durable fill clock; a UI snapshot may update signal fields.
    next.state = { ...clone(bot.state), lastTradeAt: existing.state.lastTradeAt };
    next.equity = clone(bot.equity);
    next.apiUsage = clone(bot.apiUsage);
    if (next.goal) {
      if (
        JSON.stringify(next.goal) !== JSON.stringify(bot.goal) ||
        !bot.goalState ||
        (next.goalState &&
          (next.goalState.startedAt !== bot.goalState.startedAt ||
            next.goalState.baselineValue !== bot.goalState.baselineValue))
      )
        throw new Error('bots.errors.goal');
      if (!next.goalState || next.goalState.outcome === 'active') next.goalState = clone(bot.goalState);
    }
    if (bot.status === 'paused' || bot.status === 'attention') next.status = bot.status;
    validateBotGoalState(next);
    assertDurableTargetFill(ledger, next);
    ledger.bots[ledger.bots.indexOf(existing)] = next;
  } else {
    const next = clone(bot);
    const hasSettledLiveOrder = existing?.mode === 'live' && ledger.orders.some(
      (order) => order.botId === bot.id && !order.unbroadcast &&
        (order.status === 'confirmed' || order.status === 'failed') && order.actualFeeCodec !== undefined
    );
    // Editing or stopping a live bot cannot replace any settled inventory or fee history
    // with a stale UI snapshot. A new Start allocates a new epoch through allocate().
    if (existing?.mode === 'live' && (hasSettledLiveOrder || codec(existing.portfolio.xorDeficitCodec ?? '0') > 0n)) {
      if (next.mode !== 'live') throw new Error('bots.errors.policy');
      next.portfolio = clone(existing.portfolio);
      next.state.lastTradeAt = existing.state.lastTradeAt;
      next.activity = mergeLiveActivity(existing.activity, next.activity);
    }
    // Live Start uses allocate(), so an older UI save cannot restart a stopped live session.
    if (existing?.mode === 'live' && next.mode === 'live' && existing.status === 'stopped' &&
        !['stopped', 'idle'].includes(next.status)) next.status = 'stopped';
    assertDurableTargetFill(ledger, next);
    ledger.bots = [...ledger.bots.filter((item) => item.id !== bot.id), next];
  }
}

/** Fail-closed IndexedDB ledger. A single record makes allocation + order updates one transaction. */
export type GoalEnabledBotStorage = BotStorage & { readonly goals: GoalExecutionStorage };

export function createBotStorage(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  options: { now?: () => number } = {}
): GoalEnabledBotStorage {
  let database: Promise<IDBDatabase> | undefined;
  // This set is intentionally lost on reload; an uncertain persisted submission remains pending.
  const locallyUnbroadcast = new Set<string>();
  const open = (): Promise<IDBDatabase> => {
    if (!factory) return Promise.reject(new Error('bots.errors.storage'));
    return (database ??= new Promise((resolve, reject) => {
      const request = factory.open('polkaswap-bots-v1', 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('ledger')) request.result.createObjectStore('ledger');
      };
      let rejected = false;
      request.onerror = request.onblocked = () => {
        rejected = true;
        database = undefined;
        reject(new Error('bots.errors.storage'));
      };
      request.onsuccess = () => {
        if (rejected) {
          request.result.close();
          return;
        }
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
    }));
  };
  const transact = async <T>(write: boolean, action: (ledger: Ledger) => T): Promise<T> => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        'ledger',
        write ? 'readwrite' : 'readonly',
        write ? { durability: 'strict' } : undefined
      );
      const store = tx.objectStore('ledger');
      const request = store.get('state');
      let result: T;
      let failure: unknown;
      tx.onerror = tx.onabort = () => reject(failure ?? new Error('bots.errors.storage'));
      tx.oncomplete = () => resolve(result);
      request.onsuccess = () => {
        try {
          const ledger: Ledger = request.result ?? { bots: [], orders: [] };
          result = action(ledger);
          if (write) store.put(ledger, 'state');
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
    });
  };
  return {
    goals: createGoalStorage(transact, options.now ?? Date.now),
    listBots: () =>
      transact(false, (ledger) =>
        ledger.bots.map((bot) => {
          if (bot.goal?.targetRequiresIdleOutperformance) validateBotGoalState(bot);
          assertDurableTargetFill(ledger, bot);
          return hasGoalExecutionMarker(bot) ? readGoalExecutionBot(bot) : clone(bot);
        })
      ),
    saveGoalProgress: (id, goal, state) => transact(true, (ledger) => recordGoalProgress(ledger, id, goal, state)),
    listOrders: (botId) =>
      transact(false, (ledger) =>
        ledger.orders
          .filter((o) => !botId || o.botId === botId)
          .map((order) => (hasGoalExecutionMarker(order) ? readGoalExecutionOrder(order) : clone(order)))
      ),
    listCampaigns: () => transact(false, (ledger) => clone(ledger.campaigns ?? [])),
    createCampaign: (campaign, bots, balances) =>
      transact(true, (ledger) => {
        assertLegacyGoalRecords(...bots);
        validateDiscoveryCampaign(campaign, bots);
        if (
          campaign.status !== 'paused' ||
          campaign.grant ||
          (ledger.campaigns ?? []).some((item) => item.id === campaign.id) ||
          bots.some((bot) => ledger.bots.some((item) => item.id === bot.id)) ||
          ledger.orders.some(
            (order) =>
              sameBotAccount(order.account, campaign.account) &&
              order.network === campaign.network &&
              pendingOrder(order)
          )
        )
          throw new Error('bots.errors.policy');
        assertGoalAccountClear(ledger, campaign.account, campaign.network);
        const next = [...ledger.bots, ...clone(bots)];
        assertAllocations(
          next.filter((bot) => sameBotAccount(bot.account, campaign.account) && bot.network === campaign.network),
          balances
        );
        ledger.bots = next;
        ledger.campaigns = [...(ledger.campaigns ?? []), clone(campaign)];
      }),
    grantCampaign: (id, now) =>
      transact(true, (ledger) => {
        const campaign = (ledger.campaigns ?? []).find((item) => item.id === id);
        if (!campaign) throw new Error('bots.errors.policy');
        const bots = campaign.botIds.map((botId) => ledger.bots.find((item) => item.id === botId));
        if (bots.some((bot) => !bot)) throw new Error('bots.errors.storage');
        if (
          ledger.orders.some(
            (order) =>
              sameBotAccount(order.account, campaign.account) &&
              order.network === campaign.network &&
              pendingOrder(order)
          )
        )
          throw new Error('bots.errors.pending');
        grantDiscoveryCampaign(campaign, bots as BotDefinition[], now);
        return clone(campaign);
      }),
    pauseCampaign: (id) =>
      transact(true, (ledger) => {
        const campaign = (ledger.campaigns ?? []).find((item) => item.id === id);
        if (!campaign) throw new Error('bots.errors.policy');
        campaign.status = ['completed', 'closed'].includes(campaign.status) ? campaign.status : 'paused';
        delete campaign.grant;
        for (const bot of ledger.bots)
          if (campaign.botIds.includes(bot.id) && bot.status === 'running') bot.status = 'paused';
      }),
    closeCampaign: (id) =>
      transact(true, (ledger) => {
        const campaign = (ledger.campaigns ?? []).find((item) => item.id === id);
        if (!campaign) throw new Error('bots.errors.policy');
        const bots = campaign.botIds.map((botId) => ledger.bots.find((item) => item.id === botId));
        if (bots.some((bot) => !bot)) throw new Error('bots.errors.storage');
        closeDiscoveryCampaign(campaign, bots as BotDefinition[], ledger.orders);
      }),
    recordCampaignMark: (id, mark, expectedPortfolios, admissionOrderId) =>
      transact(true, (ledger) => {
        const campaign = (ledger.campaigns ?? []).find((item) => item.id === id);
        if (!campaign) throw new Error('bots.errors.policy');
        const bots = campaign.botIds.map((botId) => ledger.bots.find((item) => item.id === botId));
        if (bots.some((bot) => !bot)) throw new Error('bots.errors.storage');
        assertDiscoveryMarkLedger(
          campaign,
          bots as BotDefinition[],
          ledger.orders,
          mark,
          expectedPortfolios,
          admissionOrderId
        );
        advanceDiscoveryCampaign(campaign, bots as BotDefinition[], mark, ledger.orders);
        return clone(campaign);
      }),
    saveBot: (bot, options) => transact(true, (ledger) => saveBotRecord(ledger, bot, options)),
    deleteBot: (id) =>
      transact(true, (ledger) => {
        const bot = ledger.bots.find((item) => item.id === id);
        assertLegacyGoalRecords(bot, ...ledger.orders.filter((order) => order.botId === id));
        // Campaign membership and its consent remain part of the durable audit record.
        if (bot?.discoveryCampaignId) throw new Error('bots.errors.policy');
        if (
          (bot?.mode === 'live' && !['idle', 'stopped'].includes(bot.status)) ||
          (bot && codec(bot.portfolio.xorDeficitCodec ?? '0') > 0n) ||
          ledger.orders.some((o) => o.botId === id && pendingOrder(o))
        )
          throw new Error('bots.errors.pending');
        ledger.bots = ledger.bots.filter((item) => item.id !== id);
      }),
    allocate: (bot, balances) =>
      transact(true, (ledger) => {
        assertLegacyGoalRecords(
          bot,
          ledger.bots.find((item) => item.id === bot.id)
        );
        assertGoalAccountClear(ledger, bot.account, bot.network);
        if (bot.discoveryCampaignId) {
          const campaign = (ledger.campaigns ?? []).find((item) => item.id === bot.discoveryCampaignId);
          if (
            !campaign ||
            campaign.status !== 'running' ||
            !campaign.grant ||
            campaign.grant.expiresAt !== bot.sessionExpiresAt ||
            campaign.progress[bot.id]?.outcome !== 'active' ||
            campaign.consent[bot.id] !== consentIdentity(bot)
          )
            throw new Error('bots.errors.session');
        }
        if (
          ledger.orders.some(
            (o) => sameBotAccount(o.account, bot.account) && o.network === bot.network && pendingOrder(o)
          )
        ) {
          throw new Error('bots.errors.pending');
        }
        const previous = ledger.bots.find((item) => item.id === bot.id);
        if (previous && codec(previous.portfolio.xorDeficitCodec ?? '0') > 0n)
          throw new Error('bots.errors.balance');
        const next = clone(bot);
        if (previous?.mode === 'live' && !['idle', 'stopped'].includes(previous.status)) {
          next.portfolio = clone(previous.portfolio);
          if (previous.goalState) next.goalState = clone(previous.goalState);
        }
        validateBotGoalState(next);
        assertDurableTargetFill(ledger, next);
        const bots = [...ledger.bots.filter((item) => item.id !== bot.id), next];
        assertAllocations(
          bots.filter((item) => sameBotAccount(item.account, bot.account) && item.network === bot.network),
          balances
        );
        ledger.bots = bots;
      }),
    reserve: (order, balances) => transact(true, (ledger) => reserveOrder(ledger, order, balances)),
    markSigned: (id, txHash, signedAtBlock, signedEnvelopeDigest, signedCallHex) =>
      transact(true, (ledger) => {
        const order = ledger.orders.find((o) => o.id === id);
        assertLegacyGoalRecords(
          order,
          ledger.bots.find((bot) => bot.id === order?.botId)
        );
        if (
          !order ||
          order.status !== 'reserved' ||
          !/^0x[0-9a-f]{64}$/i.test(txHash) ||
          !Number.isSafeInteger(signedAtBlock) ||
          signedAtBlock < 0 ||
          (signedEnvelopeDigest !== undefined && !/^[0-9a-f]{64}$/i.test(signedEnvelopeDigest)) ||
          (signedCallHex !== undefined && !/^0x(?:[0-9a-f]{2})+$/i.test(signedCallHex))
        )
          throw new Error('bots.errors.storage');
        Object.assign(order, {
          status: 'signed',
          txHash,
          signedAtBlock,
          ...(signedEnvelopeDigest ? { signedEnvelopeDigest } : {}),
          ...(signedCallHex ? { signedCallHex } : {}),
        });
      }),
    markSubmitted: async (id) => {
      await transact(true, (ledger) => {
        const order = ledger.orders.find((o) => o.id === id);
        assertLegacyGoalRecords(
          order,
          ledger.bots.find((bot) => bot.id === order?.botId)
        );
        if (!order || order.status !== 'signed') throw new Error('bots.errors.storage');
        const bot = ledger.bots.find((item) => item.id === order.botId);
        if (bot?.discoveryCampaignId) {
          const campaign = (ledger.campaigns ?? []).find((item) => item.id === bot.discoveryCampaignId);
          if (
            !campaign ||
            campaign.status !== 'running' ||
            !campaign.grant ||
            campaign.grant.expiresAt !== bot.sessionExpiresAt ||
            bot.status !== 'running' ||
            campaign.progress[bot.id]?.outcome !== 'active' ||
            campaign.consent[bot.id] !== consentIdentity(bot)
          )
            throw new Error('bots.errors.session');
        }
        order.status = 'submitted';
      });
      locallyUnbroadcast.add(id);
    },
    cancelUnbroadcastSubmitted: async (id) => {
      if (!locallyUnbroadcast.delete(id)) throw new Error('bots.errors.pending');
      await transact(true, (ledger) => cancelLocallyUnbroadcastSubmittedOrder(ledger, id));
    },
    markBroadcastAttempted: (id) => {
      locallyUnbroadcast.delete(id);
    },
    settle: (id, result) => transact(true, (ledger) => settleOrder(ledger, id, result)),
    stopBot: (id) =>
      transact(true, (ledger) => {
        assertLegacyGoalRecords(
          ledger.bots.find((bot) => bot.id === id),
          ...ledger.orders.filter((order) => order.botId === id)
        );
        if (ledger.orders.some((o) => o.botId === id && pendingOrder(o))) throw new Error('bots.errors.pending');
        const bot = ledger.bots.find((item) => item.id === id);
        assertLegacyGoalRecords(bot, ...ledger.orders.filter((order) => order.botId === id));
        if (bot?.discoveryCampaignId) throw new Error('bots.errors.policy');
        if (bot) {
          bot.status = 'stopped';
          bot.sessionExpiresAt = 0;
        }
      }),
  };
}

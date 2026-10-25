/** Pure guards for the explicit finalized goal protocol. No session, qualification, wallet or RPC authority. */
import { LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import { canonicalizeAgentIntent, createAgentDigest, createAgentIntentId } from '@/features/agent-trading/intent';
import { GOAL_SWAP_EXECUTION_PROTOCOL, projectGoalSwapEstimate } from '@/features/agent-trading/goal-swap';
import type { AgentPreparedSwap, AgentStatus, AgentSwapQuote } from '@/features/agent-trading/types';
import { fromCodec, toCodec } from './amounts';
import { EXECUTION_STATE_POLICY, type ExecutionStateContext } from './execution-state';
import { GOAL_EXACT_POLICY, GOAL_EXACT_KUSD as KUSD, GOAL_EXACT_XOR as XOR } from './goal-exact-ledger';
import type { GoalExactFill, GoalExactMark } from './goal-exact-ledger';
import type { GoalExecutionBot } from './goal-execution-types';
import { readGoalExecutionBot } from './goal-storage';
import { isExactInputQuoteWithinImpactLimit } from './quote-impact';
import type { TradeProposal } from './types';

export interface GoalQuoteProof {
  readonly mark: GoalExactMark;
  readonly fill: GoalExactFill;
  readonly callHex: string;
}
export interface GoalPreparedProof extends GoalQuoteProof {
  /** createAgentDigest('swap.envelope', prepared.envelope); not a SCALE fee/signed-envelope hash. */
  readonly envelopeDigest: string;
}
const MAX = (1n << 128n) - 1n;
const fail = (): never => {
  throw new Error('bots.errors.intent');
};
const requireValue = (value: unknown): void => {
  if (!value) fail();
};
const same = (a: unknown, b: unknown): boolean => canonicalizeAgentIntent(a) === canonicalizeAgentIntent(b);
const safeTime = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const hash = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value);
const sha = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
function amount(value: unknown, positive = false): bigint {
  requireValue(typeof value === 'string' && /^(?:0|[1-9]\d{0,38})$/.test(value as string));
  const n = BigInt(value as string);
  requireValue(n <= MAX && (!positive || n > 0n));
  return n;
}

/** Bounded own-data snapshot; omitted optional object fields match serialized agent envelopes. */
function copy<T>(input: T): T {
  let nodes = 0;
  let characters = 0;
  const visit = (value: unknown, depth: number): unknown => {
    if (++nodes > 32768 || depth > 24) return fail();
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isSafeInteger(value) ? value : fail();
    if (typeof value === 'string') {
      characters += value.length;
      return characters <= 12_000_000 ? value : fail();
    }
    if (!value || typeof value !== 'object') return fail();
    const fields = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(fields);
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 4096 || keys.length !== value.length + 1)
        return fail();
      return Object.freeze(
        Array.from({ length: value.length }, (_, i) => {
          const item = fields[String(i)];
          if (!item || !('value' in item) || !item.enumerable) return fail();
          return visit(item.value, depth + 1);
        })
      );
    }
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value)) || keys.length > 128) return fail();
    return Object.freeze(
      Object.fromEntries(
        keys.flatMap((key) => {
          const item = fields[key as string];
          if (typeof key !== 'string' || !('value' in item) || !item.enumerable) return fail();
          return item.value === undefined ? [] : [[key, visit(item.value, depth + 1)]];
        })
      )
    );
  };
  return visit(input, 0) as T;
}

/** Structural fixed-policy validation only; opaque consent and qualification digests are not authorization. */
export function validateGoalExecutionPolicy(raw: GoalExecutionBot): GoalExecutionBot {
  return readGoalExecutionBot(raw);
}

/** Bind immutable authority settings and the exact funded epoch; changing progress does not revoke consent. */
export function goalConsentIdentity(raw: GoalExecutionBot): string {
  const bot = validateGoalExecutionPolicy(raw);
  const state = bot.exactGoalState;
  return canonicalizeAgentIntent({
    account: bot.account,
    network: bot.network,
    mode: bot.mode,
    assetIn: bot.assetIn,
    assetOut: bot.assetOut,
    policy: bot.policy,
    goal: bot.goal,
    strategy: bot.strategy,
    provider: bot.provider,
    model: bot.model,
    endpoint: bot.endpoint,
    research: bot.research ?? null,
    goalExecution: bot.goalExecution,
    fundedEpoch: {
      goalId: state.goalId,
      policy: state.policy,
      episode: state.episode,
      initial: state.initial,
      limits: state.limits,
      openingMark: state.openingMark,
      openingValue: state.openingValue,
    },
  });
}

/** Project a same-state positive pool observation without rounding reserves or changing its timestamp. */
export function goalMarkFromExecutionContext(input: ExecutionStateContext): GoalExactMark {
  const context = copy(input);
  const pool = context.pool;
  requireValue(
    context.kind === 'finalized-browser-execution-context' && context.genesisHash === GOAL_EXACT_POLICY.genesisHash
  );
  requireValue(context.finalityAttestation === 'rpc-canonical-finalized' && pool?.status === 'present');
  if (pool.status !== 'present') return fail();
  requireValue(
    hash(context.block.hash) &&
      safeTime(context.block.height) &&
      context.block.height > 0 &&
      context.block.height <= 0xffffffff &&
      safeTime(context.block.timestampMs) &&
      context.block.timestampMs === pool.state.timestampMs &&
      context.block.hash === context.codecBinding.blockHash &&
      context.codecBinding.genesisHash === context.genesisHash &&
      same(pool.binding, context.codecBinding) &&
      context.expectedDenominator === pool.state.denominator &&
      pool.pair.baseAssetId === XOR &&
      pool.pair.targetAssetId === KUSD &&
      pool.pair.baseDecimals === 18 &&
      pool.pair.targetDecimals === 18 &&
      pool.state.assets.kusd.assetId === KUSD &&
      pool.state.assets.xor.assetId === XOR &&
      pool.state.assets.kusd.decimals === 18 &&
      pool.state.assets.xor.decimals === 18 &&
      context.observedFill === false &&
      context.transactionSubmitted === false
  );
  amount(pool.state.denominator, true);
  amount(pool.reserves.kusdCodec, true);
  amount(pool.reserves.xorCodec, true);
  return Object.freeze({
    blockHash: context.block.hash,
    blockNumber: context.block.height,
    timestampMs: context.block.timestampMs,
    denominator: pool.state.denominator,
    kusdReserveCodec: pool.reserves.kusdCodec,
    xorReserveCodec: pool.reserves.xorCodec,
  });
}

/** Exact quote suitability. Inventory, dual-scenario loss admission and current ownership remain caller duties. */
export function assertGoalQuote(
  raw: GoalExecutionBot,
  proposed: TradeProposal,
  inputQuote: AgentSwapQuote
): GoalQuoteProof {
  const bot = validateGoalExecutionPolicy(raw);
  const proposal = copy(proposed);
  const quote = copy(inputQuote);
  requireValue(proposal.action === 'buy' || proposal.action === 'sell');
  const input = proposal.action === 'buy' ? bot.assetIn : bot.assetOut;
  const output = proposal.action === 'buy' ? bot.assetOut : bot.assetIn;
  const inputCodec = toCodec(proposal.amount, 18);
  const inputAmount = amount(inputCodec, true);
  requireValue(inputAmount <= amount(bot.policy.maxTradeCodec[input.address], true));
  requireValue(input.address !== KUSD || inputAmount < amount(bot.exactGoalState.initial.kusdCodec, true));
  requireValue(
    quote.assetIn.address === input.address && quote.assetOut.address === output.address && sha(quote.quoteDigest)
  );
  requireValue(toCodec(quote.request.amount, 18) === inputCodec);
  requireValue(quote.execution?.protocol === GOAL_SWAP_EXECUTION_PROTOCOL);
  const estimate = quote.execution!.estimate;
  const projected = projectGoalSwapEstimate({
    execution: bot.goalExecution.execution,
    assetIn: quote.assetIn,
    assetOut: quote.assetOut,
    estimate,
    resolved: {
      assetIn: {
        address: quote.assetIn.address,
        symbol: quote.assetIn.symbol,
        name: quote.assetIn.name,
        decimals: quote.assetIn.decimals,
        isMintable: false,
      },
      assetOut: {
        address: quote.assetOut.address,
        symbol: quote.assetOut.symbol,
        name: quote.assetOut.name,
        decimals: quote.assetOut.decimals,
        isMintable: false,
      },
      amount: quote.request.amount,
      side: 'input',
      isExchangeB: false,
      slippageTolerance: '0.5',
      liquiditySource: LiquiditySourceTypes.XYKPool,
      dexId: 0,
      quoteTimeoutMs: 5000,
    },
  });
  const { quoteDigest: _digest, ...payload } = quote;
  requireValue(same(payload, projected.quote));
  requireValue(isExactInputQuoteWithinImpactLimit(quote.raw.amount, quote.raw.amountWithoutImpact, '1'));
  requireValue(amount(projected.fee.amountCodec, true) <= amount(bot.policy.feeBudgetCodec, true));
  return Object.freeze({
    mark: goalMarkFromExecutionContext(estimate.context),
    fill: Object.freeze({
      inputAsset: input.address,
      inputCodec,
      outputAsset: output.address,
      minimumOutputCodec: quote.minMaxCodec,
      feeCeilingCodec: projected.fee.amountCodec,
    }),
    callHex: estimate.fee.envelope.callHex,
  });
}

function contextCheck(bot: GoalExecutionBot, prepared: AgentPreparedSwap, status: AgentStatus, now: number): void {
  const e = prepared.envelope;
  const estimate = prepared.quote.execution?.estimate;
  requireValue(estimate?.status === 'available');
  if (!estimate) return fail();
  const context = estimate.context;
  requireValue(
    safeTime(now) &&
      safeTime(e.preparedAt) &&
      safeTime(e.expiresAt) &&
      e.expiresAt > e.preparedAt &&
      now >= e.preparedAt &&
      now < e.expiresAt &&
      now - e.preparedAt <= 30_000 &&
      safeTime(e.preparedAtBlock) &&
      safeTime(e.expiresAtBlock) &&
      e.expiresAtBlock >= e.preparedAtBlock &&
      safeTime(status.node.blockNumber) &&
      status.node.blockNumber >= e.preparedAtBlock &&
      status.node.blockNumber <= e.expiresAtBlock &&
      e.preparedAtBlock >= context.block.height &&
      status.node.connected &&
      status.wallet.connected &&
      e.network.genesisHash === bot.network &&
      e.network.genesisHash === status.node.genesisHash &&
      e.network.genesisHash === context.genesisHash &&
      e.network.runtimeSpecVersion === status.node.runtimeSpecVersion &&
      e.network.runtimeSpecVersion === context.codecBinding.runtimeVersion.specVersion &&
      e.signer.address === bot.account &&
      e.signer.address === status.wallet.address &&
      typeof e.signer.source === 'string' &&
      e.signer.source.length > 0 &&
      e.signer.source === status.wallet.source &&
      safeTime(context.receivedAtMs) &&
      safeTime(estimate.receivedAtMs) &&
      safeTime(estimate.checkedAtMs) &&
      context.receivedAtMs <= estimate.checkedAtMs &&
      estimate.checkedAtMs <= estimate.receivedAtMs &&
      estimate.receivedAtMs <= e.preparedAt &&
      context.receivedAtMs <= now &&
      now - context.receivedAtMs < EXECUTION_STATE_POLICY.maximumContextAgeMsExclusive &&
      safeTime(context.block.timestampMs) &&
      context.block.timestampMs <= now &&
      now - context.block.timestampMs <= EXECUTION_STATE_POLICY.maximumFinalizedBlockAgeMs
  );
}

/** Recheck public identity/TTL with a caller-supplied current clock; owned-session rechecks are also required. */
export function assertGoalPreparedContext(
  bot: GoalExecutionBot,
  prepared: AgentPreparedSwap,
  status: AgentStatus,
  now: number
): void {
  contextCheck(validateGoalExecutionPolicy(bot), copy(prepared), copy(status), now);
}

/** Verify explicit XYK SDK invocation, exact quote/fee evidence and every prepare-issued digest. */
export async function assertGoalPrepared(
  botInput: GoalExecutionBot,
  proposalInput: TradeProposal,
  preparedInput: AgentPreparedSwap,
  statusInput: AgentStatus,
  now: number
): Promise<GoalPreparedProof> {
  const bot = validateGoalExecutionPolicy(botInput);
  const proposal = copy(proposalInput);
  const prepared = copy(preparedInput);
  const status = copy(statusInput);
  const proof = assertGoalQuote(bot, proposal, prepared.quote);
  const { envelope: e, quote: q } = prepared;
  const args = {
    assetIn: q.assetIn.address,
    assetOut: q.assetOut.address,
    amountIn: q.amountIn,
    amountOut: q.amountOut,
    slippageTolerance: '0.5',
    isExchangeB: false,
    liquiditySource: LiquiditySourceTypes.XYKPool,
    dexId: 0,
  };
  const call = { operation: 'Swap', sdkCall: 'api.swap.execute', encoding: 'polkaswap-sdk-call-v1', args };
  const encodedCall = `0x${Array.from(new TextEncoder().encode(canonicalizeAgentIntent(call)), (v) => v.toString(16).padStart(2, '0')).join('')}`;
  const request = {
    assetIn: q.assetIn.address,
    assetOut: q.assetOut.address,
    amount: q.request.amount,
    side: 'input',
    amountIn: q.amountIn,
    amountOut: q.amountOut,
    minAmountOut: q.minAmountOut,
    slippageTolerance: '0.5',
    liquiditySource: LiquiditySourceTypes.XYKPool,
    dexId: 0,
    requestedDexId: 0,
    route: q.route,
    execution: bot.goalExecution.execution,
  };
  const { quoteDigest: _quoteDigest, ...quotePayload } = q;
  const feeAsset = q.assetIn.address === XOR ? q.assetIn : q.assetOut;
  const expectedFee = {
    operation: 'Swap',
    asset: feeAsset,
    amount: fromCodec(proof.fill.feeCeilingCodec, 18),
    amountCodec: proof.fill.feeCeilingCodec,
    source: 'finalized-runtime',
  };
  requireValue(
    prepared.canExecute === true &&
      e.schemaVersion === 1 &&
      e.action === 'swap' &&
      typeof e.nonce === 'string' &&
      /^[0-9a-f]{32}$/.test(e.nonce) &&
      same(e.quote, quotePayload) &&
      same(e.call, { ...call, encodedCall }) &&
      same(e.request, request) &&
      q.quoteDigest === e.quoteDigest &&
      prepared.intentId === e.intentId &&
      same(e.feeCeilings, [{ assetAddress: XOR, amountCodec: proof.fill.feeCeilingCodec }]) &&
      same(prepared.fees, [expectedFee]) &&
      prepared.preview.operation === 'Swap' &&
      prepared.preview.sdkCall === 'api.swap.execute' &&
      prepared.preview.stateChanging === true &&
      same(prepared.preview.args, args) &&
      same(prepared.preview.signer, { ...e.signer, connected: true }) &&
      prepared.revalidation.valid === true &&
      prepared.revalidation.requiresReapproval === false &&
      Array.isArray(prepared.revalidation.reasons) &&
      prepared.revalidation.reasons.length === 0
  );
  contextCheck(bot, prepared, status, now);
  const { intentId: _intentId, ...envelopePayload } = e;
  const [quoteDigest, callDigest, intentId, envelopeDigest] = await Promise.all([
    createAgentDigest('swap.quote', e.quote),
    createAgentDigest('swap.call', e.call),
    createAgentIntentId('swap', envelopePayload),
    createAgentDigest('swap.envelope', e),
  ]);
  requireValue(quoteDigest === e.quoteDigest && callDigest === e.callDigest && intentId === e.intentId);
  // Never certify one snapshot while the caller continues with a mutated prepared object or goal epoch.
  requireValue(
    same(copy(preparedInput), prepared) &&
      same(copy(proposalInput), proposal) &&
      goalConsentIdentity(botInput) === goalConsentIdentity(bot) &&
      botInput.goalControl.revision === bot.goalControl.revision &&
      botInput.exactGoalState.stateSha256 === bot.exactGoalState.stateSha256 &&
      same(copy(statusInput), status)
  );
  return Object.freeze({ ...proof, envelopeDigest });
}

/** Compare real SCALE call bytes separately; the envelope's encodedCall is only canonical SDK-call JSON. */
export function assertGoalCallHex(prepared: AgentPreparedSwap, actualCallHex: unknown): void {
  const quote = copy(prepared.quote);
  requireValue(quote.execution?.protocol === GOAL_SWAP_EXECUTION_PROTOCOL);
  const expected = quote.execution!.estimate.fee.envelope.callHex;
  requireValue(
    typeof actualCallHex === 'string' &&
      /^0x(?:[0-9a-fA-F]{2})+$/.test(actualCallHex) &&
      actualCallHex.length <= 8194 &&
      actualCallHex.toLowerCase() === expected
  );
}

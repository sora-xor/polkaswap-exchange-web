// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  assertGoalCallHex,
  assertGoalPrepared,
  assertGoalPreparedContext,
  assertGoalQuote,
  goalConsentIdentity,
  goalMarkFromExecutionContext,
  validateGoalExecutionPolicy,
} from '@/features/bot-trading/goal-policy';
import {
  createGoalExactLedger,
  markGoalExactLedger,
  GOAL_EXACT_POLICY,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
} from '@/features/bot-trading/goal-exact-ledger';
import type { GoalExecutionBot } from '@/features/bot-trading/goal-execution-types';
import {
  projectGoalSwapEstimate,
  GOAL_SWAP_EXECUTION_PROTOCOL,
  type AvailableExecutionStateQuote,
} from '@/features/agent-trading/goal-swap';
import { createAgentDigest, createAgentIntentId, canonicalizeAgentIntent } from '@/features/agent-trading/intent';
import { createHistoricalGoalFeeCodec } from '@/features/bot-trading/execution-codecs/fee';
import {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
} from '@/features/bot-trading/execution-codecs/execution';
import { EXECUTION_STATE_POLICY, type ExecutionStateContext } from '@/features/bot-trading/execution-state';
import { LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import type { AgentPreparedEnvelope, AgentPreparedSwap, AgentStatus } from '@/features/agent-trading/types';
import { createExecutionStateFixture } from './execution-state-fixture';
import { executionStatus } from './execution-fixtures';
import { goalStorageBot } from './goal-storage-fixtures';
import { feeBytes, hex } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';

vi.unmock('@polkadot/util-crypto');
const data = createExecutionStateFixture();
const NOW = data.now;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const proposal = { action: 'buy' as const, amount: '2.5', reason: 'test' };
const hash = (v: string) => `0x${v.repeat(64)}`;
const selector = { protocol: GOAL_SWAP_EXECUTION_PROTOCOL, expectedDenominator: '1' };

async function fixture(output = '2490000000000000000', reverse = false) {
  const kusd = { address: KUSD, symbol: 'KUSD', name: 'KUSD', decimals: 18, isMintable: true };
  const xor = { address: XOR, symbol: 'XOR', name: 'XOR', decimals: 18, isMintable: true };
  const assetIn = reverse ? xor : kusd;
  const assetOut = reverse ? kusd : xor;
  const context: ExecutionStateContext = {
    kind: 'finalized-browser-execution-context',
    policy: EXECUTION_STATE_POLICY,
    genesisHash: GOAL_EXACT_POLICY.genesisHash,
    block: {
      hash: data.identity.blockHash,
      height: 100,
      parentHash: hash('3'),
      timestampMs: data.pool.state.timestampMs,
    },
    checkedAtMs: NOW,
    receivedAtMs: NOW,
    expectedDenominator: '1',
    codecBinding: data.pool.binding,
    codeHash: hash('a'),
    pool: data.pool,
    finalityAttestation: 'rpc-canonical-finalized',
    rpcCalls: 8,
    observedFill: false,
    transactionSubmitted: false,
  };
  const request = { assetIn: assetIn.address, assetOut: assetOut.address, amountInCodec: '2500000000000000000' };
  const envelope = createHistoricalGoalFeeCodec(data.identity).buildBoundSwapEnvelope(
    { ...request, quotedAmountOutCodec: output },
    { blockNumber: 100 }
  );
  const rawInfo = hex(
    data.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '11' }).toU8a()
  );
  const info = createHistoricalExecutionCodec(data.identity).decodeQueryInfo(rawInfo);
  const rawDetails = feeBytes(1, 7, 3);
  const details = assertHistoricalFeeDetailsMatchesQueryInfo(rawDetails, info.partialFeeCodec, '0');
  const rawQuote = {
    amount: output,
    amount_without_impact: '2500000000000000000',
    fee: { [XOR]: '6000000000000000' },
    route: [assetIn.address, assetOut.address],
  };
  const estimate: AvailableExecutionStateQuote = {
    status: 'available',
    context,
    request,
    checkedAtMs: NOW,
    receivedAtMs: NOW,
    rpcCalls: 3,
    quote: {
      amountOutCodec: output,
      amountWithoutImpactCodec: rawQuote.amount_without_impact,
      minimumAmountOutCodec: envelope.minimumCodec,
      poolFeeCodec: '6000000000000000',
      feeAssetAddress: XOR,
      route: rawQuote.route,
      dexId: 0,
      liquiditySource: 'XYKPool',
      slippageBps: 50,
    },
    fee: {
      assetId: XOR,
      amountCodec: '11',
      policy: envelope.policy,
      policySha256: envelope.policySha256,
      envelope,
      info,
      details,
    },
    raw: { quote: rawQuote, info: rawInfo, details: rawDetails },
    feeAdequacyVerified: false,
    observedFill: false,
    transactionSubmitted: false,
  };
  const projected = projectGoalSwapEstimate({
    execution: selector,
    estimate,
    assetIn,
    assetOut,
    resolved: {
      assetIn,
      assetOut,
      amount: '2.5',
      side: 'input',
      isExchangeB: false,
      slippageTolerance: '0.5',
      liquiditySource: LiquiditySourceTypes.XYKPool,
      dexId: 0,
      quoteTimeoutMs: 5000,
    },
  });
  const quote = { ...projected.quote, quoteDigest: await createAgentDigest('swap.quote', projected.quote) };
  const mark = goalMarkFromExecutionContext(context);
  const ledger = createGoalExactLedger(
    {
      goalId: 'goal-1',
      startedAtMs: NOW,
      initialKusdCodec: '10000000000000000000',
      maxTradeKusdCodec: '3000000000000000000',
      maxTradeXorCodec: '3000000000000000000',
    },
    mark
  );
  const bot: GoalExecutionBot = {
    ...goalStorageBot(),
    account: executionStatus().wallet.address!,
    network: GOAL_EXACT_POLICY.genesisHash,
    assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
    policy: {
      maxTradeCodec: { [KUSD]: ledger.limits.kusdCodec, [XOR]: ledger.limits.xorCodec },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 },
      feeBudgetCodec: GOAL_EXACT_POLICY.initialFeeReserveCodec,
      sessionDurationMs: GOAL_EXACT_POLICY.durationMs,
    },
    portfolio: {
      initial: { [KUSD]: ledger.initial.kusdCodec, [XOR]: ledger.initial.xorCodec },
      holdings: { [KUSD]: ledger.holdings.kusdCodec, [XOR]: ledger.holdings.xorCodec },
      feesPaidCodec: '0',
      trades: 0,
    },
    sessionExpiresAt: ledger.episode.endedAtMs,
    goal: {
      title: 'Maximize XOR',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: GOAL_EXACT_POLICY.durationMs,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    },
    goalExecution: {
      protocol: 'finalized-xyk-goal-v1',
      execution: selector,
      goalId: ledger.goalId,
      consentDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      policyDigest: 'c'.repeat(64),
    },
    exactGoalState: ledger,
  };
  const status: AgentStatus = {
    ...executionStatus(),
    node: { ...executionStatus().node, genesisHash: bot.network, blockNumber: 101, runtimeSpecVersion: 130 },
  };
  const args = {
    assetIn: assetIn.address,
    assetOut: assetOut.address,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    slippageTolerance: '0.5',
    isExchangeB: false,
    liquiditySource: LiquiditySourceTypes.XYKPool,
    dexId: 0,
  };
  const call = { operation: 'Swap', sdkCall: 'api.swap.execute', encoding: 'polkaswap-sdk-call-v1' as const, args };
  const signer = { address: bot.account, source: status.wallet.source };
  const body: Omit<AgentPreparedEnvelope, 'intentId'> = {
    schemaVersion: 1,
    action: 'swap',
    nonce: '0'.repeat(32),
    network: { genesisHash: bot.network, runtimeSpecVersion: 130 },
    signer,
    preparedAt: NOW,
    expiresAt: NOW + 30000,
    preparedAtBlock: 101,
    expiresAtBlock: 106,
    request: {
      assetIn: assetIn.address,
      assetOut: assetOut.address,
      amount: '2.5',
      side: 'input',
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      minAmountOut: quote.minAmountOut,
      slippageTolerance: '0.5',
      liquiditySource: LiquiditySourceTypes.XYKPool,
      dexId: 0,
      requestedDexId: 0,
      route: quote.route,
      execution: selector,
    },
    quote: projected.quote as unknown as Record<string, unknown>,
    quoteDigest: quote.quoteDigest,
    call: { ...call, encodedCall: hex(new TextEncoder().encode(canonicalizeAgentIntent(call))) },
    callDigest: '',
    feeCeilings: [{ assetAddress: XOR, amountCodec: '11' }],
  };
  body.callDigest = await createAgentDigest('swap.call', body.call);
  const intentId = await createAgentIntentId('swap', body);
  const prepared: AgentPreparedSwap = {
    intentId,
    envelope: { ...body, intentId },
    quote,
    canExecute: true,
    preview: {
      operation: 'Swap',
      sdkCall: 'api.swap.execute',
      stateChanging: true,
      signer: { ...signer, connected: true },
      args,
      summary: 'Synthetic',
    },
    fees: [projected.fee],
    requiredBalances: [],
    warnings: [],
    revalidation: {
      valid: true,
      requiresReapproval: false,
      reasons: [],
      checkedAt: NOW,
      currentBlock: 101,
      currentNetwork: body.network,
    },
  };
  return {
    bot,
    context,
    quote,
    prepared,
    status,
    proposed: { ...proposal, action: reverse ? ('sell' as const) : ('buy' as const) },
  };
}
function mutate<T>(value: T, path: string, replacement: unknown): T {
  const v = clone(value);
  let cursor = v as Record<string, unknown>;
  const keys = path.split('.');
  for (const key of keys.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>;
  cursor[keys.at(-1)!] = replacement;
  return v;
}
let f: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => {
  f = await fixture();
});

describe('explicit finalized goal guards', () => {
  it('validates fixed policy and projects exact mark and fill without treating digests as qualification', async () => {
    expect(validateGoalExecutionPolicy(f.bot)).toEqual(f.bot);
    const proof = assertGoalQuote(f.bot, proposal, f.quote);
    expect(proof.mark).toEqual(f.bot.exactGoalState.openingMark);
    expect(proof.fill).toEqual({
      inputAsset: KUSD,
      inputCodec: '2500000000000000000',
      outputAsset: XOR,
      minimumOutputCodec: '2477550000000000000',
      feeCeilingCodec: '11',
    });
    const prepared = await assertGoalPrepared(f.bot, proposal, f.prepared, f.status, NOW);
    expect(prepared.envelopeDigest).toBe(await createAgentDigest('swap.envelope', f.prepared.envelope));
    expect(prepared.callHex).toBe(f.quote.execution!.estimate.fee.envelope.callHex);
    expect(Object.isFrozen(prepared.fill)).toBe(true);
  });
  it('accepts an explicit reverse quote without confusing native fee/output identities', async () => {
    const r = await fixture(undefined, true);
    expect(assertGoalQuote(r.bot, r.proposed, r.quote).fill).toMatchObject({
      inputAsset: XOR,
      outputAsset: KUSD,
      feeCeilingCodec: '11',
    });
    await expect(assertGoalPrepared(r.bot, r.proposed, r.prepared, r.status, NOW)).resolves.toHaveProperty(
      'envelopeDigest'
    );
  });
  it('compares natural input by exact base units while preserving its original quote spelling', () => {
    const quote = mutate(f.quote, 'request.amount', '2.500');
    expect(() => assertGoalQuote(f.bot, { ...proposal, amount: '2.50' }, quote)).not.toThrow();
    expect(() => assertGoalQuote(f.bot, { ...proposal, amount: '2.5000000000000000001' }, quote)).toThrow();
    expect(() => assertGoalQuote(f.bot, proposal, mutate(quote, 'request.amount', '2.501'))).toThrow();
  });
  it('uses exact impact cross multiplication at 1%, rejecting 1.004% despite any display rewrite', async () => {
    const boundary = await fixture('2475000000000000000');
    expect(() => assertGoalQuote(boundary.bot, proposal, boundary.quote)).not.toThrow();
    const over = await fixture('2474900000000000000');
    expect(() => assertGoalQuote(over.bot, proposal, over.quote)).toThrow();
    expect(() => assertGoalQuote(over.bot, proposal, { ...over.quote, priceImpact: '-1' })).toThrow();
  });
  it.each([
    ['policy.slippagePercent', '1'],
    ['policy.maxPriceImpactPercent', '2'],
    ['policy.feeBudgetCodec', '1'],
    ['policy.sessionDurationMs', 3600000],
    ['goal.targetReturnPercent', '6'],
    ['goal.maxLossPercent', '10'],
    ['goal.durationMs', 3600000],
    ['goal.lossMetric', 'baseline'],
    ['goal.valuationAsset', 'input'],
    ['assetIn.decimals', 6],
    ['goalExecution.protocol', 'goal-episodes-v2'],
    ['goalExecution.execution.expectedDenominator', '2'],
    ['goalExecution.qualificationDigest', 'true'],
    ['portfolio.holdings.' + KUSD, '1'],
  ])('rejects conflicting fixed-policy/binding %s', (path, replacement) => {
    expect(() => validateGoalExecutionPolicy(mutate(f.bot, path, replacement))).toThrow();
  });
  it('rejects the presence of legacy goalState, including undefined', () => {
    expect(() => validateGoalExecutionPolicy({ ...f.bot, goalState: undefined })).toThrow();
  });
  it('binds strategy/certificate/epoch while allowing ordinary exact progress', () => {
    const identity = goalConsentIdentity(f.bot);
    expect(goalConsentIdentity(mutate(f.bot, 'strategy.amount', '1'))).not.toBe(identity);
    expect(goalConsentIdentity(mutate(f.bot, 'goalExecution.qualificationDigest', 'd'.repeat(64)))).not.toBe(identity);
    const next = markGoalExactLedger(f.bot.exactGoalState, {
      expectedRevision: 0,
      accountingAtMs: NOW + 1,
      mark: f.bot.exactGoalState.lastMark,
    });
    expect(goalConsentIdentity({ ...f.bot, exactGoalState: next })).toBe(identity);
    expect(
      goalConsentIdentity({ ...f.bot, activity: [], apiUsage: { inputTokens: 1, outputTokens: 0, requests: 1 } })
    ).toBe(identity);
  });
  it.each([
    ['quote.request.liquiditySource', 'Default'],
    ['quote.request.dexId', 'best'],
    ['quote.raw.amount', '1'],
    ['quote.execution.estimate.fee.envelope.minimumCodec', '1'],
    ['quote.execution.estimate.fee.amountCodec', '12'],
    ['quote.execution.estimate.context.pool.state.denominator', '2'],
    ['quote.quoteDigest', 'invalid'],
  ])('rejects inconsistent quote %s', (path, replacement) => {
    const value = mutate(f, path, replacement);
    expect(() => assertGoalQuote(value.bot, proposal, value.quote)).toThrow();
  });
  it.each([
    ['envelope.call.args.liquiditySource', 'Default'],
    ['envelope.call.encodedCall', '0x00'],
    ['envelope.request.execution.expectedDenominator', '2'],
    ['envelope.request.requestedDexId', 'best'],
    ['envelope.feeCeilings.0.amountCodec', '12'],
    ['fees.0.source', 'payment-info'],
    ['fees.0.amountCodec', '12'],
    ['envelope.quoteDigest', 'a'.repeat(64)],
    ['envelope.callDigest', 'b'.repeat(64)],
    ['intentId', 'bad'],
    ['preview.args.dexId', 1],
    ['revalidation.valid', false],
    ['canExecute', false],
  ])('rejects changed prepared material %s', async (path, replacement) => {
    await expect(
      assertGoalPrepared(f.bot, proposal, mutate(f.prepared, path, replacement), f.status, NOW)
    ).rejects.toThrow();
  });
  it('compares actual SCALE call separately from canonical SDK JSON', () => {
    const call = f.quote.execution!.estimate.fee.envelope.callHex;
    expect(() => assertGoalCallHex(f.prepared, call)).not.toThrow();
    expect(() => assertGoalCallHex(f.prepared, call.toUpperCase().replace('0X', '0x'))).not.toThrow();
    expect(() => assertGoalCallHex(f.prepared, f.prepared.envelope.call.encodedCall)).toThrow();
    expect(() => assertGoalCallHex(f.prepared, `${call}00`)).toThrow();
  });
  it('requires fresh owned-context-compatible public clocks and node/signer identity', () => {
    expect(() => assertGoalPreparedContext(f.bot, f.prepared, f.status, NOW + 4999)).not.toThrow();
    expect(() => assertGoalPreparedContext(f.bot, f.prepared, f.status, NOW + 5000)).toThrow();
    expect(() => assertGoalPreparedContext(f.bot, f.prepared, f.status, NOW - 1)).toThrow();
    for (const [path, replacement] of [
      ['wallet.address', 'other'],
      ['node.runtimeSpecVersion', 131],
      ['node.blockNumber', 99],
      ['node.connected', false],
    ] as const)
      expect(() => assertGoalPreparedContext(f.bot, f.prepared, mutate(f.status, path, replacement), NOW)).toThrow();
  });
  it('rejects changes while digest promises are pending instead of approving a stale snapshot', async () => {
    const prepared = clone(f.prepared);
    const result = assertGoalPrepared(f.bot, proposal, prepared, f.status, NOW);
    prepared.quote.minMaxCodec = '1';
    await expect(result).rejects.toThrow();
  });
  it('rejects a changed pause/resume control revision while prepared digests are pending', async () => {
    const bot = clone(f.bot);
    const result = assertGoalPrepared(bot, proposal, f.prepared, f.status, NOW);
    bot.goalControl.revision++;
    expect(goalConsentIdentity(bot)).toBe(goalConsentIdentity(f.bot));
    await expect(result).rejects.toThrow();
  });
  it('does not execute quote accessors during validation', () => {
    const getter = vi.fn(() => f.quote.execution);
    const quote = { ...f.quote };
    Object.defineProperty(quote, 'execution', { enumerable: true, get: getter });
    expect(() => assertGoalQuote(f.bot, proposal, quote)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});

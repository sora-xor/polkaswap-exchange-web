import { LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import { FPNumber } from '@/lib/substrate/math';
import { canonicalizeAgentIntent, createAgentDigest, createAgentIntentId } from '@/features/agent-trading/intent';
import { codec, percent, toCodec } from './amounts';
import { sameBotAccount } from './account-identity';
import { assertTradeFunds } from './allocation';
import { evaluateBotGoal } from './goals';
import type { BotDefinition, BotOrder, BotSession, TradeProposal } from './types';
import type { AgentPreparedSwap, AgentStatus, AgentSwapQuote } from '@/features/agent-trading/types';

/** Consent identity excludes mutable performance/state and includes every authority-bearing setting. */
export function consentIdentity(bot: BotDefinition): string {
  return canonicalizeAgentIntent({
    account: bot.account,
    network: bot.network,
    assetIn: bot.assetIn,
    assetOut: bot.assetOut,
    strategy: bot.strategy,
    initialAllocation: bot.portfolio.initial,
    ...(bot.discoveryCampaignId ? { discoveryCampaignId: bot.discoveryCampaignId } : {}),
    policy: bot.policy,
    mode: bot.mode,
    ...(bot.goal ? { goal: bot.goal } : {}),
    ...(bot.goalState
      ? {
          goalRun: {
            startedAt: bot.goalState.startedAt,
            baselineValue: bot.goalState.baselineValue,
            ...(bot.goal?.targetRequiresIdleOutperformance ? { idleHoldings: bot.goalState.idleHoldings } : {}),
          },
        }
      : {}),
  });
}

/** Resolve a directional proposal into the exact token pair and positive input base units. */
export function proposalInput(bot: BotDefinition, proposal: TradeProposal) {
  if (!['buy', 'sell'].includes(proposal.action)) throw new Error('bots.errors.proposal');
  const input = proposal.action === 'buy' ? bot.assetIn : bot.assetOut;
  const output = proposal.action === 'buy' ? bot.assetOut : bot.assetIn;
  const inputCodec = toCodec(proposal.amount, input.decimals);
  if (!codec(inputCodec) || codec(inputCodec) > codec(bot.policy.maxTradeCodec[input.address] ?? '0')) {
    throw new Error('bots.errors.policy');
  }
  assertTradeFunds(bot, input.address, inputCodec);
  return { input, output, inputCodec };
}

/** Refuse expired, changed, disconnected, or non-live signing sessions. */
export function assertSession(bot: BotDefinition, session: BotSession, status: AgentStatus, now = Date.now()): void {
  if (bot.goal && evaluateBotGoal(bot, now)?.outcome !== 'active') throw new Error('bots.errors.goalComplete');
  if (
    bot.mode !== 'live' ||
    bot.status !== 'running' ||
    bot.id !== session.botId ||
    bot.account !== session.account ||
    bot.network !== session.network ||
    !status.wallet.connected ||
    !status.node.connected ||
    !sameBotAccount(status.wallet.address, session.account) ||
    status.node.genesisHash !== session.network ||
    now >= session.expiresAt ||
    now >= bot.sessionExpiresAt
  ) {
    throw new Error('bots.errors.session');
  }
}

/** Longest standard session, and the longest reviewed campaign or extended session. */
export const SESSION_MAX_MS = 24 * 60 * 60_000;
export const EXTENDED_SESSION_MAX_MS = 14 * 24 * 60 * 60_000;

/** Validate percentages, nonzero ceilings, token pair, and bounded session lifetime at consent. */
export function validatePolicy(bot: BotDefinition): void {
  // Extended sessions are reserved for reviewed rule strategies outside discovery campaigns.
  if (
    bot.extendedSession !== undefined &&
    (bot.extendedSession !== true || bot.strategy.kind !== 'rules' || bot.discoveryCampaignId)
  )
    throw new Error('bots.errors.policy');
  if (
    !bot.account ||
    !bot.network ||
    bot.assetIn.address === bot.assetOut.address ||
    !Number.isSafeInteger(bot.policy.sessionDurationMs) ||
    bot.policy.sessionDurationMs < 60_000 ||
    bot.policy.sessionDurationMs >
      (bot.discoveryCampaignId || bot.extendedSession ? EXTENDED_SESSION_MAX_MS : SESSION_MAX_MS)
  )
    throw new Error('bots.errors.policy');
  if (codec(bot.portfolio.xorDeficitCodec ?? '0') > 0n) throw new Error('bots.errors.balance');
  percent(bot.policy.slippagePercent, '50');
  percent(bot.policy.maxPriceImpactPercent, '100');
  for (const asset of [bot.assetIn, bot.assetOut]) {
    if (!codec(bot.policy.maxTradeCodec[asset.address] ?? '0')) throw new Error('bots.errors.policy');
  }
  if (!codec(bot.policy.feeBudgetCodec)) throw new Error('bots.errors.policy');
}

/** Account allocations include running, paused and attention bots; stopped tokens are released. */
export function assertAllocations(bots: BotDefinition[], balances: Record<string, string>): void {
  const sums: Record<string, bigint> = {};
  for (const bot of bots.filter((item) => item.mode === 'live' && !['idle', 'stopped'].includes(item.status))) {
    if (codec(bot.portfolio.xorDeficitCodec ?? '0') > 0n) throw new Error('bots.errors.balance');
    for (const [asset, amount] of Object.entries(bot.portfolio.holdings)) {
      sums[asset] = (sums[asset] ?? 0n) + codec(amount);
    }
  }
  for (const [asset, amount] of Object.entries(sums)) {
    if (amount > codec(balances[asset] ?? '0')) throw new Error('bots.errors.balance');
  }
}

/** Check fresh quote limits, including exact token identity and a positive minimum output. */
export function assertQuote(bot: BotDefinition, proposal: TradeProposal, quote: AgentSwapQuote): void {
  const { input, output, inputCodec } = proposalInput(bot, proposal);
  const impact = new FPNumber(quote.priceImpact);
  const expectedMinimum = new FPNumber(quote.amountOut, output.decimals)
    .mul(new FPNumber('1').sub(percent(bot.policy.slippagePercent).div(new FPNumber('100'))))
    .toCodecString();
  if (
    !impact.isFinity() ||
    impact.abs().gt(percent(bot.policy.maxPriceImpactPercent)) ||
    quote.assetIn.address !== input.address ||
    quote.assetOut.address !== output.address ||
    quote.assetIn.decimals !== input.decimals ||
    quote.assetOut.decimals !== output.decimals ||
    quote.request.side !== 'input' ||
    !new FPNumber(quote.request.slippageTolerance).eq(new FPNumber(bot.policy.slippagePercent)) ||
    toCodec(quote.amountIn, input.decimals) !== inputCodec ||
    quote.amountInMeta.codec !== inputCodec ||
    !codec(quote.minMaxCodec) ||
    codec(quote.minMaxCodec) !== codec(expectedMinimum)
  ) {
    throw new Error('bots.errors.policy');
  }
}

/** Recheck immutable envelope context synchronously after the final awaited work before signing or broadcasting. */
export function assertPreparedContext(
  bot: BotDefinition,
  prepared: AgentPreparedSwap,
  status: AgentStatus,
  now = Date.now()
): void {
  const e = prepared.envelope;
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(e.preparedAt) ||
    e.preparedAt < 0 ||
    !Number.isSafeInteger(e.expiresAt) ||
    e.expiresAt <= e.preparedAt ||
    now < e.preparedAt ||
    now >= e.expiresAt ||
    now - e.preparedAt > 30_000 ||
    !Number.isSafeInteger(e.preparedAtBlock) ||
    e.preparedAtBlock < 0 ||
    !Number.isSafeInteger(e.expiresAtBlock) ||
    e.expiresAtBlock < e.preparedAtBlock ||
    !Number.isSafeInteger(status.node.blockNumber) ||
    status.node.blockNumber < e.preparedAtBlock ||
    status.node.blockNumber > e.expiresAtBlock ||
    !status.node.connected ||
    !e.network.genesisHash ||
    e.network.genesisHash !== bot.network ||
    e.network.genesisHash !== status.node.genesisHash ||
    !Number.isSafeInteger(e.network.runtimeSpecVersion) ||
    e.network.runtimeSpecVersion <= 0 ||
    e.network.runtimeSpecVersion !== status.node.runtimeSpecVersion ||
    !status.wallet.connected ||
    !e.signer.address ||
    !sameBotAccount(e.signer.address, bot.account) ||
    !sameBotAccount(e.signer.address, status.wallet.address) ||
    e.signer.source !== status.wallet.source
  )
    throw new Error('bots.errors.intent');
}

/** Verify the complete prepare-issued envelope, then require its encoded call to match the swap quote. */
export async function assertPrepared(
  bot: BotDefinition,
  proposal: TradeProposal,
  prepared: AgentPreparedSwap,
  status: AgentStatus,
  now = Date.now()
): Promise<void> {
  const { envelope: e, intentId } = prepared;
  const { intentId: ignored, ...payload } = e;
  const [quoteHash, callHash, expectedId] = await Promise.all([
    createAgentDigest('swap.quote', e.quote),
    createAgentDigest('swap.call', e.call),
    createAgentIntentId('swap', payload),
  ]);
  const { quoteDigest: ignoredQuoteDigest, ...quotePayload } = prepared.quote;
  const q = prepared.quote;
  const expectedCall = {
    operation: 'Swap',
    sdkCall: 'api.swap.execute',
    encoding: 'polkaswap-sdk-call-v1',
    args: {
      assetIn: q.assetIn.address,
      assetOut: q.assetOut.address,
      amountIn: q.amountIn,
      amountOut: q.amountOut,
      slippageTolerance: q.request.slippageTolerance,
      isExchangeB: false,
      liquiditySource: LiquiditySourceTypes.Default,
      dexId: q.dexId,
    },
  };
  const encodedCall = `0x${Array.from(new TextEncoder().encode(canonicalizeAgentIntent(expectedCall)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('')}`;
  if (
    !prepared.canExecute ||
    e.action !== 'swap' ||
    e.schemaVersion !== 1 ||
    e.intentId !== intentId ||
    expectedId !== intentId ||
    quoteHash !== e.quoteDigest ||
    callHash !== e.callDigest ||
    canonicalizeAgentIntent(e.quote) !== canonicalizeAgentIntent(quotePayload) ||
    canonicalizeAgentIntent(e.call) !== canonicalizeAgentIntent({ ...expectedCall, encodedCall })
  )
    throw new Error('bots.errors.intent');
  assertPreparedContext(bot, prepared, status, now);
  assertQuote(bot, proposal, q);
}

/** Unresolved signatures retain their reservation and block all further bot trades for the account. */
export function pendingOrder(order: BotOrder): boolean {
  return ['reserved', 'signed', 'submitted'].includes(order.status);
}

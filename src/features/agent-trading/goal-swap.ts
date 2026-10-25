/** Pure projection of one finalized provider estimate; no RPC, wallet, approval or execution. */
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import {
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { HISTORICAL_GOAL_FEE_POLICY } from '@/features/bot-trading/execution-codecs/fee';
import type { ExecutionStateQuote } from '@/features/bot-trading/execution-state';
import { agentError } from './errors';
import { canonicalizeAgentIntent } from './intent';
import type { AgentAsset, AgentAssetAmount, AgentFeeEstimate, AgentResolvedSwapRequest, AgentSwapQuote } from './types';

export const GOAL_SWAP_EXECUTION_PROTOCOL = 'finalized-xyk-native-fee-v1' as const;
export interface GoalSwapExecutionRequest {
  protocol: typeof GOAL_SWAP_EXECUTION_PROTOCOL;
  expectedDenominator: string;
}
export type AvailableExecutionStateQuote = Extract<ExecutionStateQuote, { status: 'available' }>;
export interface GoalSwapExecutionEvidence {
  protocol: typeof GOAL_SWAP_EXECUTION_PROTOCOL;
  estimate: AvailableExecutionStateQuote;
}
export interface GoalSwapProjectionInput {
  execution: GoalSwapExecutionRequest;
  resolved: AgentResolvedSwapRequest;
  assetIn: AgentAsset;
  assetOut: AgentAsset;
  estimate: AvailableExecutionStateQuote;
}
export interface GoalSwapProjection {
  quote: Omit<AgentSwapQuote, 'quoteDigest'> & { execution: GoalSwapExecutionEvidence };
  fee: AgentFeeEstimate & { source: 'finalized-runtime' };
}

const MAX = (1n << 128n) - 1n;
const SCALE = 10n ** 18n;
const fail = (): never => {
  throw agentError('INVALID_AGENT_STATE', 'Invalid finalized goal swap evidence.');
};

/** Inspect own data only; request validation must not invoke accessors or inherited properties. */
function fields(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(descriptors);
  if (
    names.some((key) => typeof key !== 'string') ||
    (keys && (names.length !== keys.length || keys.some((key) => !Object.hasOwn(descriptors, key)))) ||
    names.some((key) => !('value' in descriptors[key as string]) || !descriptors[key as string].enumerable)
  )
    return fail();
  return Object.fromEntries(names.map((key) => [key, descriptors[key as string].value]));
}
function unsigned(value: unknown, positive = false): bigint {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,38})$/.test(value)) return fail();
  const amount = BigInt(value);
  if (amount > MAX || (positive && amount === 0n)) return fail();
  return amount;
}
function natural(value: bigint): string {
  const padded = value.toString().padStart(19, '0');
  const fraction = padded.slice(-18).replace(/0+$/, '');
  return `${padded.slice(0, -18)}${fraction ? `.${fraction}` : ''}`;
}
function fromNatural(value: unknown): bigint {
  if (typeof value !== 'string') return fail();
  const match = /^(0|[1-9]\d{0,38})(?:\.(\d{1,18}))?$/.exec(value);
  if (!match) return fail();
  return unsigned((BigInt(match[1]) * SCALE + BigInt((match[2] ?? '').padEnd(18, '0'))).toString(), true);
}

/** Undefined selects the existing legacy flow; every other value must explicitly select this protocol. */
export function readGoalSwapExecution(value: unknown): GoalSwapExecutionRequest | undefined {
  if (value === undefined) return undefined;
  const request = fields(value, ['protocol', 'expectedDenominator']);
  if (request.protocol !== GOAL_SWAP_EXECUTION_PROTOCOL) return fail();
  return Object.freeze({
    protocol: GOAL_SWAP_EXECUTION_PROTOCOL,
    expectedDenominator: unsigned(request.expectedDenominator, true).toString(),
  });
}

/** Detach provider evidence without invoking getters; cycles and oversized/non-JSON trees are rejected. */
function snapshot<T>(value: T): T {
  let nodes = 0;
  let characters = 0;
  const copy = (entry: unknown, depth: number): unknown => {
    if (++nodes > 4096 || depth > 16) return fail();
    if (entry === null || typeof entry === 'boolean') return entry;
    if (typeof entry === 'number') return Number.isFinite(entry) ? entry : fail();
    if (typeof entry === 'string') {
      characters += entry.length;
      return characters <= 4_500_000 ? entry : fail();
    }
    if (Array.isArray(entry)) {
      if (Object.getPrototypeOf(entry) !== Array.prototype || entry.length > 256) return fail();
      const descriptors = Object.getOwnPropertyDescriptors(entry);
      if (Reflect.ownKeys(descriptors).length !== entry.length + 1) return fail();
      return Object.freeze(
        Array.from({ length: entry.length }, (_, index) => {
          const item = descriptors[String(index)];
          if (!item || !('value' in item) || !item.enumerable) return fail();
          return copy(item.value, depth + 1);
        })
      );
    }
    return Object.freeze(
      Object.fromEntries(Object.entries(fields(entry)).map(([key, item]) => [key, copy(item, depth + 1)]))
    );
  };
  return copy(value, 0) as T;
}
function publicAsset(value: unknown): AgentAsset {
  const asset = fields(value);
  if (
    (asset.address !== KUSD && asset.address !== XOR) ||
    asset.decimals !== 18 ||
    typeof asset.symbol !== 'string' ||
    asset.symbol !== (asset.address === KUSD ? 'KUSD' : 'XOR') ||
    typeof asset.name !== 'string' ||
    !asset.name.length ||
    asset.name.length > 256
  )
    return fail();
  // Wallet balances and caller-only SDK fields are deliberately not projected into a public quote.
  return Object.freeze({ address: asset.address, symbol: asset.symbol, name: asset.name, decimals: 18 });
}
const same = (a: unknown, b: unknown) => canonicalizeAgentIntent(a) === canonicalizeAgentIntent(b);
const amountMeta = (asset: AgentAsset, value: bigint): AgentAssetAmount => {
  const rendered = natural(value);
  return Object.freeze({
    asset,
    value: rendered,
    codec: value.toString(),
    decimals: 18,
    display: `${rendered} ${asset.symbol}`,
  });
};

/**
 * Project a caller-owned, available provider result. This checks amount/route/state consistency,
 * not provenance or freshness: the caller must use the live session and assertCurrent around work.
 * Impact is a negative percentage rounded away from zero to at most 18 places for display only.
 * Pool fees are already in the quote outputs; native network fees remain a separate estimate.
 */
export function projectGoalSwapEstimate(input: GoalSwapProjectionInput): GoalSwapProjection {
  try {
    return project(input);
  } catch {
    return fail();
  }
}

/** Copy and cross-check the evidence before producing standard quote and fee fields. */
function project(input: GoalSwapProjectionInput): GoalSwapProjection {
  const inputFields = fields(input, ['execution', 'resolved', 'assetIn', 'assetOut', 'estimate']);
  const execution = readGoalSwapExecution(inputFields.execution);
  if (!execution) return fail();
  const resolved = fields(inputFields.resolved);
  const assetIn = publicAsset(inputFields.assetIn);
  const assetOut = publicAsset(inputFields.assetOut);
  if (
    assetIn.address === assetOut.address ||
    resolved.side !== 'input' ||
    resolved.isExchangeB !== false ||
    resolved.dexId !== 0 ||
    resolved.liquiditySource !== LiquiditySourceTypes.XYKPool ||
    resolved.slippageTolerance !== '0.5' ||
    !same(publicAsset(resolved.assetIn), assetIn) ||
    !same(publicAsset(resolved.assetOut), assetOut)
  )
    return fail();
  const inputAmount = fromNatural(resolved.amount);
  const estimate = snapshot(inputFields.estimate) as AvailableExecutionStateQuote;
  if (estimate.status !== 'available') return fail();
  const { context, quote, fee, request, raw } = estimate;
  if (!context || !quote || !fee || !request || !raw || !fee.envelope) return fail();
  const output = unsigned(quote.amountOutCodec, true);
  const withoutImpact = unsigned(quote.amountWithoutImpactCodec, true);
  const minimum = unsigned(quote.minimumAmountOutCodec, true);
  const networkFee = unsigned(fee.amountCodec, true);
  const poolFee = unsigned(quote.poolFeeCodec);
  const rawQuote = fields(raw.quote);
  const pool = context.pool;
  const binding = context.codecBinding;
  if (!pool || !binding || !pool.state || !fee.info || !fee.details) return fail();
  const envelopeBinding = Object.fromEntries(Object.keys(binding).map((key) => [key, fields(fee.envelope)[key]]));
  const route = [assetIn.address, assetOut.address];
  if (
    inputAmount.toString() !== request.amountInCodec ||
    request.assetIn !== assetIn.address ||
    request.assetOut !== assetOut.address ||
    output > withoutImpact ||
    minimum !== (output * 9950n) / 10000n ||
    quote.dexId !== 0 ||
    quote.liquiditySource !== 'XYKPool' ||
    quote.slippageBps !== 50 ||
    quote.feeAssetAddress !== XOR ||
    !same(quote.route, route) ||
    context.kind !== 'finalized-browser-execution-context' ||
    context.genesisHash !== GENESIS ||
    context.expectedDenominator !== execution.expectedDenominator ||
    pool.state.denominator !== execution.expectedDenominator ||
    pool.status !== 'present' ||
    context.finalityAttestation !== 'rpc-canonical-finalized' ||
    binding.genesisHash !== GENESIS ||
    binding.blockHash !== context.block?.hash ||
    !same(pool.binding, binding) ||
    !same(envelopeBinding, binding) ||
    pool.state.assets.kusd.assetId !== KUSD ||
    pool.state.assets.xor.assetId !== XOR ||
    pool.state.assets.kusd.decimals !== 18 ||
    pool.state.assets.xor.decimals !== 18 ||
    fee.assetId !== XOR ||
    fee.envelope.feeAssetAddress !== XOR ||
    fee.envelope.assetIn !== assetIn.address ||
    fee.envelope.assetOut !== assetOut.address ||
    fee.envelope.amountInCodec !== request.amountInCodec ||
    fee.envelope.minimumCodec !== minimum.toString() ||
    !same(fee.policy, HISTORICAL_GOAL_FEE_POLICY) ||
    !same(fee.envelope.policy, HISTORICAL_GOAL_FEE_POLICY) ||
    fee.policySha256 !== fee.envelope.policySha256 ||
    !/^[0-9a-f]{64}$/.test(fee.policySha256) ||
    typeof fee.envelope.callHex !== 'string' ||
    fee.envelope.callHex.length > 8194 ||
    !/^0x(?:[0-9a-f]{2})+$/.test(fee.envelope.callHex) ||
    fee.info.partialFeeCodec !== networkFee.toString() ||
    fee.details.finalFee !== networkFee.toString() ||
    rawQuote.amount !== output.toString() ||
    rawQuote.amount_without_impact !== withoutImpact.toString() ||
    !same(rawQuote.fee, { [XOR]: poolFee.toString() }) ||
    !same(rawQuote.route, route) ||
    estimate.feeAdequacyVerified !== false ||
    estimate.observedFill !== false ||
    estimate.transactionSubmitted !== false
  )
    return fail();
  if (!same(assertHistoricalFeeDetailsMatchesQueryInfo(raw.details, fee.info.partialFeeCodec, '0'), fee.details))
    return fail();
  const impactUnits = ((withoutImpact - output) * 100n * SCALE + withoutImpact - 1n) / withoutImpact;
  const feeAsset = assetIn.address === XOR ? assetIn : assetOut;
  const providerFee = Object.freeze({ [XOR]: poolFee.toString() });
  const result: GoalSwapProjection = {
    quote: {
      request: {
        amount: resolved.amount as string,
        side: 'input',
        slippageTolerance: '0.5',
        liquiditySource: LiquiditySourceTypes.XYKPool,
        dexId: 0,
      },
      assetIn,
      assetOut,
      dexId: 0,
      amountIn: natural(inputAmount),
      amountOut: natural(output),
      amountWithoutImpact: natural(withoutImpact),
      amountInMeta: amountMeta(assetIn, inputAmount),
      amountOutMeta: amountMeta(assetOut, output),
      amountWithoutImpactMeta: amountMeta(assetOut, withoutImpact),
      minAmountOut: natural(minimum),
      minAmountOutMeta: amountMeta(assetOut, minimum),
      minMaxCodec: minimum.toString(),
      priceImpact: impactUnits === 0n ? '0' : `-${natural(impactUnits)}`,
      liquidityProviderFee: providerFee,
      rewards: [],
      route,
      distribution: [],
      liquiditySources: [LiquiditySourceTypes.XYKPool],
      raw: { amount: output.toString(), amountWithoutImpact: withoutImpact.toString(), fee: providerFee },
      execution: { protocol: GOAL_SWAP_EXECUTION_PROTOCOL, estimate },
    },
    fee: {
      operation: 'Swap',
      asset: feeAsset,
      amount: natural(networkFee),
      amountCodec: networkFee.toString(),
      source: 'finalized-runtime',
    },
  };
  return snapshot(result);
}

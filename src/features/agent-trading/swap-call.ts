import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';

import { agentError } from './errors';
import type { AgentAsset, AgentAssetAmount, AgentSwapQuote } from './types';

/** Exact chain arguments; no natural-unit amount is re-parsed or rounded by this builder. */
export type SwapCallAmount =
  | { WithDesiredInput: { desiredAmountIn: string; minAmountOut: string } }
  | { WithDesiredOutput: { desiredAmountOut: string; maxAmountIn: string } };

/** The only capability needed from a chain API: construct an unsigned swap without signing or submitting it. */
export type SwapCallFactory<T> = (
  dexId: number,
  assetIn: string,
  assetOut: string,
  amount: SwapCallAmount,
  sources: Exclude<LiquiditySourceTypes, LiquiditySourceTypes.Default>[],
  filterMode: 'Disabled' | 'AllowSelected'
) => T;

const CODEC = /^(0|[1-9]\d*)$/;

function exactCodec(value: unknown, positive: boolean): string {
  if (typeof value !== 'string' || value.length > 120 || !CODEC.test(value) || (positive && value === '0'))
    throw agentError('INVALID_AMOUNT', 'Swap call amounts must be exact unsigned codec strings.');
  return value;
}

function validAsset(asset: AgentAsset | undefined): asserts asset is AgentAsset {
  if (
    !asset ||
    typeof asset.address !== 'string' ||
    !asset.address ||
    asset.address.length > 256 ||
    /\s|[\u0000-\u001f\u007f]/.test(asset.address) ||
    !Number.isSafeInteger(asset.decimals) ||
    asset.decimals < 0 ||
    asset.decimals > 255
  )
    throw agentError('INTENT_INTEGRITY_FAILED', 'Swap call asset metadata is invalid.');
}

function amountCodec(meta: AgentAssetAmount | undefined, asset: AgentAsset): string {
  if (
    !meta ||
    meta.asset?.address !== asset.address ||
    meta.asset.decimals !== asset.decimals ||
    meta.decimals !== asset.decimals
  )
    throw agentError('INTENT_INTEGRITY_FAILED', 'Swap call amount metadata does not match its asset.');
  return exactCodec(meta.codec, true);
}

/**
 * Build the same unsigned SCALE call for fee estimation and execution from a reviewed quote's
 * exact bounds. This function has no network, signer, wallet, or submission capability of its own.
 */
export function buildSwapCall<T>(swap: SwapCallFactory<T>, quote: AgentSwapQuote): T {
  if (!quote || !quote.request || !['input', 'output'].includes(quote.request.side))
    throw agentError('INVALID_SWAP_SIDE', 'Swap side must be "input" or "output".');
  validAsset(quote.assetIn);
  validAsset(quote.assetOut);
  if (quote.assetIn.address === quote.assetOut.address)
    throw agentError('INTENT_INTEGRITY_FAILED', 'Swap call assets must differ.');
  if (!Number.isSafeInteger(quote.dexId) || quote.dexId < 0)
    throw agentError('INVALID_DEX_ID', 'Swap call requires a resolved non-negative integer DEX id.');
  const source = quote.request.liquiditySource ?? LiquiditySourceTypes.Default;
  // Undefined is the explicit optional default; null or other malformed values never select a fallback route.
  if (
    quote.request.liquiditySource === null ||
    typeof source !== 'string' ||
    !Object.values(LiquiditySourceTypes).includes(source)
  )
    throw agentError('INVALID_LIQUIDITY_SOURCE', 'Swap call liquidity source is not supported.');
  const input = amountCodec(quote.amountInMeta, quote.assetIn);
  const output = amountCodec(quote.amountOutMeta, quote.assetOut);
  const limit = exactCodec(quote.minMaxCodec, quote.request.side === 'output');
  const amount: SwapCallAmount =
    quote.request.side === 'input'
      ? { WithDesiredInput: { desiredAmountIn: input, minAmountOut: limit } }
      : { WithDesiredOutput: { desiredAmountOut: output, maxAmountIn: limit } };
  return swap(
    quote.dexId,
    quote.assetIn.address,
    quote.assetOut.address,
    amount,
    source === LiquiditySourceTypes.Default ? [] : [source],
    source === LiquiditySourceTypes.Default ? 'Disabled' : 'AllowSelected'
  );
}

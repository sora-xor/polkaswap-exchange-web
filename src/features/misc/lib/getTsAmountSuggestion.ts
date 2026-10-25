import { FPNumber } from '@sora-substrate/sdk';
import { isGetTsPlanAmount, type GetTsPlanPreviewResult, type GetTsPlanRequest } from './getTsPlanQuote';

export type GetTsAmountSuggestion =
  | { state: 'ready'; preview: GetTsPlanPreviewResult }
  | { state: 'unavailable' | 'no-match' };

/** Finds a smaller indicative budget with fresh route quotes; never changes input or authorizes payment. */
export async function findGetTsAmountSuggestion(
  request: GetTsPlanRequest,
  quote: (request: GetTsPlanRequest) => Promise<GetTsPlanPreviewResult>,
  signal?: AbortSignal,
  now: () => number = Date.now
): Promise<GetTsAmountSuggestion> {
  if (!isGetTsPlanAmount(request.amount, request.paymentAsset)) return { state: 'no-match' };
  const original = new FPNumber(request.amount);
  const decimals =
    request.paymentAsset === 'USD' ? 2 : request.paymentAsset === 'USDT' ? 6 : request.paymentAsset === 'TON' ? 9 : 18;
  let candidate = original.div(new FPNumber('2')).dp(decimals, 3);
  const visited = new Set<string>();
  // Six sequential reads bound provider load. This is a usable example, not a claimed maximum.
  for (let attempt = 0; attempt < 6; attempt++) {
    if (signal?.aborted) return { state: 'unavailable' };
    const amount = candidate.toString();
    if (!candidate.gt(FPNumber.ZERO) || !candidate.lt(original) || visited.has(amount)) break;
    visited.add(amount);
    let result: GetTsPlanPreviewResult;
    try {
      result = await quote({ ...request, amount });
    } catch {
      return { state: 'unavailable' };
    }
    if (signal?.aborted) return { state: 'unavailable' };
    if (
      result.source !== request.source ||
      result.paymentAsset !== request.paymentAsset ||
      (result.purpose ?? 'ts') !== (request.purpose ?? 'ts') ||
      result.amount !== amount
    )
      return { state: 'unavailable' };
    if (result.state === 'ready' && result.feasible === true) {
      return result.expiresAt !== undefined && result.expiresAt > now()
        ? { state: 'ready', preview: result }
        : { state: 'unavailable' };
    }
    if (result.state === 'unavailable') return { state: 'unavailable' };
    if (
      result.reason === 'card-minimum' &&
      request.paymentAsset === 'USD' &&
      isGetTsPlanAmount(result.providerMinimumUsd ?? '', 'USD')
    ) {
      candidate = new FPNumber(result.providerMinimumUsd as string);
    } else if (['price-impact', 'conversion-impact', 'cap-exceeded'].includes(result.reason ?? '')) {
      candidate = candidate.div(new FPNumber('2')).dp(decimals, 3);
    } else {
      break;
    }
  }
  return { state: 'no-match' };
}

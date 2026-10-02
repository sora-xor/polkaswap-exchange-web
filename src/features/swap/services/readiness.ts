/** Independent quote and route states prevent service failures from masquerading as unsupported pairs. */
export type SwapPathStatus = 'idle' | 'loading' | 'available' | 'unavailable' | 'error';
export type SwapQuoteStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SwapBlockReason =
  | 'disconnected'
  | 'selectTokens'
  | 'checking'
  | 'pathError'
  | 'noRoute'
  | 'enterAmount'
  | 'quoteError'
  | 'insufficientLiquidity'
  | 'insufficientToken'
  | 'insufficientFee'
  | 'checkingFee'
  | 'reviewChanged';
export type SwapReadiness = { ready: true } | { ready: false; reason: SwapBlockReason; retryable: boolean };

/** A failed DEX check is inconclusive unless another check positively verifies a route. */
export function resolveSwapPathStatus(results: PromiseSettledResult<boolean>[]): SwapPathStatus {
  if (results.some((result) => result.status === 'fulfilled' && result.value)) return 'available';
  if (!results.length || results.some((result) => result.status === 'rejected')) return 'error';
  return 'unavailable';
}

/** Derives the same blocking reason for the form and its review dialog. */
export function resolveSwapReadiness(input: {
  connected: boolean;
  tokensSelected: boolean;
  path: SwapPathStatus;
  quote: SwapQuoteStatus;
  hasAmount: boolean;
  hasOutput: boolean;
  loggedIn: boolean;
  insufficientToken: boolean;
  fee: 'unknown' | 'covered' | 'shortfall';
}): SwapReadiness {
  const blocked = (reason: SwapBlockReason, retryable = false): SwapReadiness => ({ ready: false, reason, retryable });
  if (!input.tokensSelected) return blocked('selectTokens');
  if (!input.connected) return blocked('disconnected');
  if (input.path === 'error') return blocked('pathError', true);
  if (input.path === 'unavailable') return blocked('noRoute');
  if (input.quote === 'error') return blocked('quoteError', true);
  if (input.path !== 'available' || input.quote === 'loading') return blocked('checking');
  if (!input.hasAmount) return blocked('enterAmount');
  if (input.quote !== 'ready') return blocked('quoteError', true);
  if (!input.hasOutput) return blocked('insufficientLiquidity');
  if (input.loggedIn && input.fee === 'unknown') return blocked('checkingFee');
  if (input.loggedIn && input.fee === 'shortfall') return blocked('insufficientFee');
  if (input.loggedIn && input.insufficientToken) return blocked('insufficientToken');
  return { ready: true };
}

/** Anonymous counter contract shared with the standalone MOF collector. No free-text fields are accepted. */
export const BUY_XOR_FUNNEL_STEPS = [
  'view',
  'quote_requested',
  'quote_available',
  'quote_blocked',
  'quote_unavailable',
  'wallets_ready',
  'provider_handoff',
  'conversion_submitted',
  'conversion_received',
  'conversion_failed',
  'bridge_submitted',
  'bridge_received',
  'bridge_failed',
  'swap_submitted',
  'swap_failed',
  'xor_received',
] as const;
export const BUY_XOR_FUNNEL_ROUTES = ['unset', 'ethereum', 'card', 'ton', 'sora'] as const;
export const BUY_XOR_FUNNEL_REASONS = ['none', 'amount', 'liquidity', 'fees', 'provider', 'network', 'other'] as const;
export type BuyXorFunnelStep = (typeof BUY_XOR_FUNNEL_STEPS)[number];
export type BuyXorFunnelRoute = (typeof BUY_XOR_FUNNEL_ROUTES)[number];
export type BuyXorFunnelReason = (typeof BUY_XOR_FUNNEL_REASONS)[number];
export interface BuyXorFunnelEvent {
  v: 1;
  step: BuyXorFunnelStep;
  route: BuyXorFunnelRoute;
  reason: BuyXorFunnelReason;
}
export const BUY_XOR_FUNNEL_ENDPOINT = 'https://mof.sora.org/api/buy-xor/events';
export const BUY_XOR_FUNNEL_CONSENT_KEY = 'polkaswap:buy-xor:anonymous-counts:v1';

/** Reject extended objects rather than silently stripping an accidentally supplied address, hash or amount. */
export function parseBuyXorFunnelEvent(value: unknown): BuyXorFunnelEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (Object.keys(event).sort().join(',') !== 'reason,route,step,v' || event.v !== 1) return null;
  if (!BUY_XOR_FUNNEL_STEPS.includes(event.step as BuyXorFunnelStep)) return null;
  if (!BUY_XOR_FUNNEL_ROUTES.includes(event.route as BuyXorFunnelRoute)) return null;
  if (!BUY_XOR_FUNNEL_REASONS.includes(event.reason as BuyXorFunnelReason)) return null;
  if (event.step !== 'view' && event.route === 'unset') return null;
  if (!['quote_blocked', 'quote_unavailable'].includes(event.step as string) && event.reason !== 'none') return null;
  return {
    v: 1,
    step: event.step as BuyXorFunnelStep,
    route: event.route as BuyXorFunnelRoute,
    reason: event.reason as BuyXorFunnelReason,
  };
}

/** Collapses public quote failure enums; arbitrary provider messages are never included in an event. */
export function buyXorFunnelReason(value: unknown): BuyXorFunnelReason {
  if (value === 'invalid-amount' || value === 'card-minimum') return 'amount';
  if (value === 'gas' || value === 'budget') return 'fees';
  if (value === 'wallet' || value === 'bridge') return 'network';
  if (value === 'provider' || value === 'conversion') return 'provider';
  if (value === 'liquidity') return 'liquidity';
  if (value === 'price-impact' || value === 'conversion-impact' || value === 'liquidity-unavailable')
    return 'liquidity';
  if (value === 'fees-unavailable' || value === 'fees-insufficient') return 'fees';
  if (value === 'card-provider' || value === 'conversion-unavailable' || value === 'native-ton') return 'provider';
  if (value === 'mainnet' || value === 'expired') return 'network';
  return 'other';
}

/** Browser privacy signals override an earlier opt-in; there is no fallback to a third-party analytics client. */
export function buyXorPrivacyBlocked(
  browser: { doNotTrack?: string | null; globalPrivacyControl?: boolean } = typeof navigator === 'undefined'
    ? {}
    : navigator,
  legacyDnt: unknown = typeof window === 'undefined'
    ? undefined
    : (window as Window & { doNotTrack?: string }).doNotTrack
): boolean {
  return (
    browser.globalPrivacyControl === true ||
    [browser.doNotTrack, legacyDnt].some((value) => value === '1' || value === 'yes')
  );
}

/** Sends a single opted-in coarse counter. A timeout is uncertain delivery and is deliberately never retried. */
export async function sendBuyXorFunnelEvent(
  input: unknown,
  options: {
    consent: boolean;
    privacyBlocked: boolean;
    origin: string;
    fetcher?: typeof fetch;
  }
): Promise<'disabled' | 'recorded' | 'unavailable'> {
  const event = parseBuyXorFunnelEvent(input);
  if (!options.consent || options.privacyBlocked || options.origin !== 'https://polkaswap.io' || !event)
    return 'disabled';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await (options.fetcher ?? fetch)(BUY_XOR_FUNNEL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      redirect: 'error',
      keepalive: true,
      signal: controller.signal,
    });
    return response.status === 204 ? 'recorded' : 'unavailable';
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timeout);
  }
}

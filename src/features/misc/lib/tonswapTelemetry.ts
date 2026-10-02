import { trackEvent } from '@/utils/telemetry';

export type TonswapFunnelStep =
  | 'view'
  | 'preview'
  | 'wallet_ready'
  | 'funding_started'
  | 'burn_submitted'
  | 'reservation_indexed'
  | 'receipt_saved';
export type TonswapFunnelSource = 'campaign' | 'swap' | 'deposit' | 'bridge';

/** Reuses the configured analytics client with a fixed payload that excludes wallet and amount data. */
export function trackTonswapStep(step: TonswapFunnelStep, source: TonswapFunnelSource = 'campaign'): void {
  trackEvent('tonswap_funnel', { campaign: 'tonswap', step, source });
}

import { describe, expect, it, vi } from 'vitest';

import { trackTonswapStep } from '@/features/misc/lib/tonswapTelemetry';
import { trackEvent } from '@/utils/telemetry';

vi.mock('@/utils/telemetry', () => ({ trackEvent: vi.fn() }));

describe('TONSWAP campaign telemetry', () => {
  it('emits only the fixed stage and source fields, without wallet or monetary data', () => {
    trackTonswapStep('funding_started', 'swap');
    expect(trackEvent).toHaveBeenCalledWith('tonswap_funnel', {
      campaign: 'tonswap',
      step: 'funding_started',
      source: 'swap',
    });
  });
});

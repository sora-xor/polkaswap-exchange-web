import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REALTIME_PROFILE,
  normalizeRealtimeProfile,
  resolveRealtimeBackoffDelayMs,
  resolveRealtimeFlushIntervalMs,
} from '@/services/realtime/profile';

describe('realtime profile helpers', () => {
  it('normalizes unknown profile values to the default profile', () => {
    expect(normalizeRealtimeProfile(undefined)).toBe(DEFAULT_REALTIME_PROFILE);
    expect(normalizeRealtimeProfile(null)).toBe(DEFAULT_REALTIME_PROFILE);
    expect(normalizeRealtimeProfile('unsupported')).toBe(DEFAULT_REALTIME_PROFILE);
  });

  it('keeps valid profile values', () => {
    expect(normalizeRealtimeProfile('balanced')).toBe('balanced');
    expect(normalizeRealtimeProfile('ultra')).toBe('ultra');
    expect(normalizeRealtimeProfile('load_first')).toBe('load_first');
  });

  it('resolves flush intervals by profile, priority, and visibility', () => {
    expect(
      resolveRealtimeFlushIntervalMs({
        profile: 'balanced',
        priority: 'critical',
        visible: true,
      })
    ).toBe(250);

    expect(
      resolveRealtimeFlushIntervalMs({
        profile: 'ultra',
        priority: 'standard',
        visible: true,
      })
    ).toBe(250);

    expect(
      resolveRealtimeFlushIntervalMs({
        profile: 'load_first',
        priority: 'background',
        visible: true,
      })
    ).toBe(7000);

    expect(
      resolveRealtimeFlushIntervalMs({
        profile: 'ultra',
        priority: 'critical',
        visible: false,
      })
    ).toBe(1000);
  });

  it('resolves reconnect backoff delay with growth, cap, and jitter', () => {
    const noJitter = () => 0;
    const maxJitter = () => 1;

    expect(resolveRealtimeBackoffDelayMs(0, noJitter)).toBe(2000);
    expect(resolveRealtimeBackoffDelayMs(1, noJitter)).toBe(3400);
    expect(resolveRealtimeBackoffDelayMs(2, noJitter)).toBe(5779);

    // Large attempts must cap at max exponential delay (120000) before jitter.
    expect(resolveRealtimeBackoffDelayMs(99, noJitter)).toBe(120000);
    expect(resolveRealtimeBackoffDelayMs(99, maxJitter)).toBe(150000);
  });
});

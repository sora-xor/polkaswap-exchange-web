import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REALTIME_CONNECTION_CAP,
  ENABLED_REALTIME_CONNECTION_CAP,
  resolveRealtimeConnectionCap,
} from '@/utils/realtimeConnectionCap';

describe('realtime connection cap helper', () => {
  it('uses positive finite numeric caps as integer budgets', () => {
    expect(resolveRealtimeConnectionCap(3)).toBe(3);
    expect(resolveRealtimeConnectionCap(3.8)).toBe(3);
  });

  it('maps boolean enabled caps to the conservative default budget', () => {
    expect(resolveRealtimeConnectionCap(true)).toBe(ENABLED_REALTIME_CONNECTION_CAP);
  });

  it('maps absent, disabled, or invalid caps to a finite unlimited budget', () => {
    expect(resolveRealtimeConnectionCap(false)).toBe(DEFAULT_REALTIME_CONNECTION_CAP);
    expect(resolveRealtimeConnectionCap(undefined)).toBe(DEFAULT_REALTIME_CONNECTION_CAP);
    expect(resolveRealtimeConnectionCap(0)).toBe(DEFAULT_REALTIME_CONNECTION_CAP);
    expect(resolveRealtimeConnectionCap(Number.POSITIVE_INFINITY)).toBe(DEFAULT_REALTIME_CONNECTION_CAP);
    expect(Number.isFinite(resolveRealtimeConnectionCap(null))).toBe(true);
  });
});

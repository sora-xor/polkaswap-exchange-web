import { describe, expect, it } from 'vitest';
import { resolveSwapPathStatus, resolveSwapReadiness } from '@/features/swap/services/readiness';

describe('swap route evidence', () => {
  it('only reports no route when every check completed negatively', () => {
    expect(resolveSwapPathStatus([{ status: 'fulfilled', value: false }])).toBe('unavailable');
    expect(
      resolveSwapPathStatus([
        { status: 'fulfilled', value: false },
        { status: 'rejected', reason: 'offline' },
      ])
    ).toBe('error');
    expect(
      resolveSwapPathStatus([
        { status: 'fulfilled', value: true },
        { status: 'rejected', reason: 'offline' },
      ])
    ).toBe('available');
    expect(resolveSwapPathStatus([])).toBe('error');
  });
  it('keeps recovery states visible before login and does not confuse them with liquidity', () => {
    const input = {
      connected: true,
      tokensSelected: true,
      path: 'available' as const,
      quote: 'error' as const,
      hasAmount: true,
      hasOutput: false,
      loggedIn: false,
      insufficientToken: false,
      fee: 'unknown' as const,
    };
    expect(resolveSwapReadiness(input)).toEqual({ ready: false, reason: 'quoteError', retryable: true });
    expect(resolveSwapReadiness({ ...input, path: 'error' })).toEqual({
      ready: false,
      reason: 'pathError',
      retryable: true,
    });
    expect(resolveSwapReadiness({ ...input, quote: 'ready' })).toEqual({
      ready: false,
      reason: 'insufficientLiquidity',
      retryable: false,
    });
    expect(resolveSwapReadiness({ ...input, connected: false })).toEqual({
      ready: false,
      reason: 'disconnected',
      retryable: false,
    });
  });
});

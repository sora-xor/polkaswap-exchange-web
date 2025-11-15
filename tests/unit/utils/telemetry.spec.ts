import { describe, expect, it, vi } from 'vitest';

import { trackEvent } from '@/utils/telemetry';

describe('telemetry helper', () => {
  it('uses global telemetry client when available', () => {
    const track = vi.fn();
    (globalThis as Record<string, unknown>).__PS_TELEMETRY__ = { track };

    trackEvent('test_event', { foo: 'bar' });

    expect(track).toHaveBeenCalledWith('test_event', { foo: 'bar' });

    delete (globalThis as Record<string, unknown>).__PS_TELEMETRY__;
  });

  it('falls back to console.debug when client missing', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    trackEvent('fallback_event', { ok: true });

    expect(debug).toHaveBeenCalledWith('[telemetry] fallback_event', { ok: true });

    debug.mockRestore();
  });
});

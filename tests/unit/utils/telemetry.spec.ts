import { describe, expect, it, vi } from 'vitest';

import { getBuildVariant, registerTelemetryStub, trackEvent } from '@/utils/telemetry';

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

  it('reads build variant from the global window', () => {
    (window as Record<string, unknown>).__PS_BUILD_VARIANT__ = 'vue3-native';

    expect(getBuildVariant()).toBe('vue3-native');

    delete (window as Record<string, unknown>).__PS_BUILD_VARIANT__;
  });

  it('returns unknown when build variant is missing', () => {
    delete (window as Record<string, unknown>).__PS_BUILD_VARIANT__;

    expect(getBuildVariant()).toBe('unknown');
  });

  it('registers a console-based telemetry stub when enabled via query', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    registerTelemetryStub('?telemetryStub=1');

    trackEvent('stub_event', { ok: true });

    expect(info).toHaveBeenCalledWith('[telemetry stub]', 'stub_event', { ok: true });

    info.mockRestore();
  });

  it('does not register stub when flag is false', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    registerTelemetryStub('?telemetryStub=false');
    // ensure any existing stub is not used
    delete (globalThis as Record<string, unknown>).__PS_TELEMETRY__;
    delete (globalThis as Record<string, unknown>).__PS_ANALYTICS__;

    trackEvent('stub_event', { ok: true });

    expect(info).not.toHaveBeenCalled();

    info.mockRestore();
  });
});

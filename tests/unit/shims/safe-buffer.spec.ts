import { describe, expect, it } from 'vitest';

import safeBuffer, { Buffer, INSPECT_MAX_BYTES, SlowBuffer, kMaxLength } from '@/shims/safe-buffer';

describe('safe-buffer shim', () => {
  it('exports buffer primitives expected by stream polyfills', () => {
    expect(typeof kMaxLength).toBe('number');
    expect(kMaxLength).toBeGreaterThan(0);
    expect(typeof INSPECT_MAX_BYTES).toBe('number');
    expect(INSPECT_MAX_BYTES).toBeGreaterThan(0);
    expect(Buffer).toBeTypeOf('function');
    expect(SlowBuffer).toBeTypeOf('function');
  });

  it('exposes default object compatible with safe-buffer', () => {
    expect(safeBuffer.Buffer).toBe(Buffer);
    expect(safeBuffer.SlowBuffer).toBe(SlowBuffer);
    expect(safeBuffer.kMaxLength).toBe(kMaxLength);
    expect(safeBuffer.INSPECT_MAX_BYTES).toBe(INSPECT_MAX_BYTES);
  });
});

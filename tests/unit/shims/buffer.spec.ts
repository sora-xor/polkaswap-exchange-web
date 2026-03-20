import { describe, expect, it } from 'vitest';

import bufferDefault, { Buffer, kMaxLength, kStringMaxLength } from '@/shims/buffer';

describe('buffer shim', () => {
  it('exports buffer length guards required by safe-buffer consumers', () => {
    expect(Buffer).toBeTypeOf('function');
    expect(typeof kMaxLength).toBe('number');
    expect(kMaxLength).toBeGreaterThan(0);
    expect(typeof kStringMaxLength).toBe('number');
    expect(kStringMaxLength).toBeGreaterThan(0);
  });

  it('backfills static limits on Buffer constructor', () => {
    expect((Buffer as { kMaxLength?: number }).kMaxLength).toBe(kMaxLength);
    expect((Buffer as { kStringMaxLength?: number }).kStringMaxLength).toBe(kStringMaxLength);
    expect(bufferDefault).toBe(Buffer);
  });
});

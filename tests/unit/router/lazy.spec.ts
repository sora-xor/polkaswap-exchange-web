import { describe, expect, it } from 'vitest';

import { isRetryableAsyncComponentError } from '@/router/lazy';

describe('router/lazy', () => {
  it('treats transient default initialization errors as retryable', () => {
    expect(isRetryableAsyncComponentError(new ReferenceError("Cannot access 'default' before initialization."))).toBe(
      true
    );
  });

  it('treats dynamic import fetch failures as retryable', () => {
    expect(
      isRetryableAsyncComponentError(
        new TypeError('Failed to fetch dynamically imported module: http://localhost:8888/assets/BuySell.js')
      )
    ).toBe(true);
    expect(isRetryableAsyncComponentError('ChunkLoadError: Loading chunk 42 failed.')).toBe(true);
  });

  it('ignores unrelated async component errors', () => {
    expect(isRetryableAsyncComponentError(new Error('Network timeout'))).toBe(false);
    expect(isRetryableAsyncComponentError('other error')).toBe(false);
  });
});

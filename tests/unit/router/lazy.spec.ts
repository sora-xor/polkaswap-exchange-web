import { describe, expect, it } from 'vitest';

import { isRetryableAsyncComponentError, loadAsyncImportWithRetry } from '@/router/lazy';

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

  it('treats css preload throttling errors as retryable', () => {
    expect(
      isRetryableAsyncComponentError(
        new Error('Unable to preload CSS for https://gateway/assets/Swap.css: status of 429')
      )
    ).toBe(true);
    expect(isRetryableAsyncComponentError('net::ERR_ABORTED while loading chunk')).toBe(true);
  });

  it('ignores unrelated async component errors', () => {
    expect(isRetryableAsyncComponentError(new Error('Network timeout'))).toBe(false);
    expect(isRetryableAsyncComponentError('other error')).toBe(false);
  });

  it('retries transient import failures and resolves', async () => {
    let attempts = 0;

    const result = await loadAsyncImportWithRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new TypeError('Failed to fetch dynamically imported module: http://localhost/chunk.js');
        }
        return { ok: true };
      },
      { maxAttempts: 3, retryDelayMs: 0 }
    );

    expect(result).toEqual({ ok: true });
    expect(attempts).toBe(3);
  });

  it('does not retry non-retryable failures', async () => {
    let attempts = 0;

    await expect(
      loadAsyncImportWithRetry(
        async () => {
          attempts += 1;
          throw new Error('Network timeout');
        },
        { maxAttempts: 3, retryDelayMs: 0 }
      )
    ).rejects.toThrow('Network timeout');

    expect(attempts).toBe(1);
  });
});

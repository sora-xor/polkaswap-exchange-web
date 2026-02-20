import { describe, expect, it } from 'vitest';

import { isRetryableAsyncComponentError } from '@/router/lazy';

describe('router/lazy', () => {
  it('treats transient default initialization errors as retryable', () => {
    expect(isRetryableAsyncComponentError(new ReferenceError("Cannot access 'default' before initialization."))).toBe(
      true
    );
  });

  it('ignores unrelated async component errors', () => {
    expect(isRetryableAsyncComponentError(new Error('Network timeout'))).toBe(false);
    expect(isRetryableAsyncComponentError('other error')).toBe(false);
  });
});

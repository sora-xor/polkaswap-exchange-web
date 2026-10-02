import { afterEach, describe, expect, it } from 'vitest';

import { EVM_SUBMISSION_LOCK_UNAVAILABLE, withCrossTabEvmSubmissionLock } from '@/utils/bridge/eth/submissionLock';

describe('withCrossTabEvmSubmissionLock', () => {
  const originalLocks = navigator.locks;

  afterEach(() => {
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: originalLocks,
    });
  });

  it('fails closed in a browser that cannot coordinate with other tabs', async () => {
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: undefined,
    });

    await expect(withCrossTabEvmSubmissionLock('evm-submit', async () => 'unsafe')).rejects.toMatchObject({
      code: EVM_SUBMISSION_LOCK_UNAVAILABLE,
    });
  });
});

import { describe, expect, it, vi } from 'vitest';

import { retryOnEmptyResult } from '@/indexer/queries/retry';

describe('retryOnEmptyResult', () => {
  it('retries until the result is no longer empty', async () => {
    const request = vi
      .fn<() => Promise<number[]>>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([1]);

    const result = await retryOnEmptyResult(request, (value) => value.length === 0, 3, 1);

    expect(result).toEqual([1]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('returns the first result when it is not empty', async () => {
    const request = vi.fn<() => Promise<string[]>>().mockResolvedValueOnce(['ok']);

    const result = await retryOnEmptyResult(request, (value) => value.length === 0, 3, 1);

    expect(result).toEqual(['ok']);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('returns the last empty result when all attempts are exhausted', async () => {
    const request = vi.fn<() => Promise<null>>().mockResolvedValue(null);

    const result = await retryOnEmptyResult(request, (value) => value === null, 2, 1);

    expect(result).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const delayMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  delay: delayMock,
}));

import { useLoading } from '@/lib/soraneo-wallet/src/composables/useLoading';

describe('useLoading', () => {
  beforeEach(() => {
    delayMock.mockClear();
  });

  it('retries withChainApi when chain api getter throws during connection setup', async () => {
    let calls = 0;
    const chainApi = {
      get api() {
        calls += 1;
        if (calls === 1) {
          throw new TypeError("Cannot read properties of undefined (reading 'api')");
        }

        return {
          isReady: Promise.resolve(),
        };
      },
    } as any;

    const { withChainApi } = useLoading();
    const handler = vi.fn(async () => undefined);

    await withChainApi(chainApi, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});

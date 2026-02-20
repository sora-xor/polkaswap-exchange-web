import { describe, expect, it, vi } from 'vitest';

const delayMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/util', () => ({
  delay: delayMock,
}));

import { useLoading } from '@/lib/soraneo-wallet/src/composables/useLoading';

describe('wallet useLoading composable', () => {
  it('retries withChainApi when api getter throws before connection is ready', async () => {
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
    const handler = vi.fn(async () => 'ok');

    await withChainApi(chainApi, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});

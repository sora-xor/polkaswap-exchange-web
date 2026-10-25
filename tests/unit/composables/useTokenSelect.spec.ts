import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTokenSelect } from '@/composables/useTokenSelect';

describe('useTokenSelect', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('tracks loading while an async token selection handler is pending', async () => {
    let resolveHandler: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      resolveHandler = resolve;
    });

    const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();
    const handler = vi.fn(async () => gate);

    const pending = withSelectAssetLoading(handler);

    expect(isSelectAssetLoading.value).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    resolveHandler?.();
    await pending;

    expect(isSelectAssetLoading.value).toBe(false);
  });

  it('logs and rethrows token selection errors while clearing loading state', async () => {
    const error = new Error('selection failed');
    const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();

    await expect(
      withSelectAssetLoading(async () => {
        throw error;
      })
    ).rejects.toBe(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(isSelectAssetLoading.value).toBe(false);
  });
});

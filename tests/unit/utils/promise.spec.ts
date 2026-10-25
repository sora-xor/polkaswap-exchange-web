import { afterEach, describe, expect, it, vi } from 'vitest';

import delay from '@/utils/promise';

describe('utils/promise', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the default delay', async () => {
    vi.useFakeTimers();

    const onResolved = vi.fn();
    const pending = delay().then(onResolved);

    await vi.advanceTimersByTimeAsync(49);
    expect(onResolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it('resolves after a custom delay', async () => {
    vi.useFakeTimers();

    const onResolved = vi.fn();
    const pending = delay(125).then(onResolved);

    await vi.advanceTimersByTimeAsync(124);
    expect(onResolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});

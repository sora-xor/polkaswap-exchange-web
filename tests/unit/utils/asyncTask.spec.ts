import { describe, expect, it, vi } from 'vitest';

import { createCoalescedAsyncTask } from '@/utils/asyncTask';

describe('createCoalescedAsyncTask', () => {
  it('coalesces calls during an active task into exactly one follow-up run', async () => {
    let resolveFirst!: () => void;
    const firstRun = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const task = vi.fn().mockReturnValueOnce(firstRun).mockResolvedValue(undefined);
    const run = createCoalescedAsyncTask(task);

    const active = run();
    const queuedA = run();
    const queuedB = run();

    expect(task).toHaveBeenCalledOnce();
    expect(queuedA).toBe(active);
    expect(queuedB).toBe(active);

    resolveFirst();
    await active;

    expect(task).toHaveBeenCalledTimes(2);

    await run();
    expect(task).toHaveBeenCalledTimes(3);
  });

  it('still runs a queued refresh after the active request fails', async () => {
    let rejectFirst!: (error: Error) => void;
    const firstRun = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const task = vi.fn().mockReturnValueOnce(firstRun).mockResolvedValue(undefined);
    const run = createCoalescedAsyncTask(task);

    const active = run();
    void run();
    rejectFirst(new Error('stale source failed'));

    await expect(active).resolves.toBeUndefined();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('keeps a refresh requested in the active task completion microtask', async () => {
    let resolveFirst!: () => void;
    const firstRun = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const task = vi.fn().mockReturnValueOnce(firstRun).mockResolvedValue(undefined);
    const run = createCoalescedAsyncTask(task);
    const active = run();

    firstRun.then(() => {
      void run();
    });
    resolveFirst();
    await active;

    expect(task).toHaveBeenCalledTimes(2);
  });
});

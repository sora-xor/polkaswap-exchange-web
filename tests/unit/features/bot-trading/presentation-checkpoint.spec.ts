import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCheckpointPresentation } from '@/features/bot-trading/presentation-checkpoint';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('actual checkpoint presentation acknowledgement', () => {
  it('waits for actual settlement when a parent requests acknowledgement before rendering starts', async () => {
    const presentation = createCheckpointPresentation();
    const finished = vi.fn();
    const pending = presentation.waitForCheckpoint(1).then(finished);
    await vi.advanceTimersByTimeAsync(90);
    expect(finished).not.toHaveBeenCalled();
    presentation.begin(1);
    await vi.advanceTimersByTimeAsync(140);
    expect(finished).not.toHaveBeenCalled();
    presentation.settle(1);
    await pending;
    expect(finished).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    await presentation.waitForCheckpoint(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases superseded waits and ignores late settlement from an older checkpoint', async () => {
    const presentation = createCheckpointPresentation();
    presentation.begin(1);
    const first = presentation.waitForCheckpoint(1);
    presentation.begin(2);
    await first;
    const finished = vi.fn();
    const second = presentation.waitForCheckpoint(2).then(finished);
    presentation.settle(1);
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    presentation.settle(2);
    await second;
    expect(finished).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts promptly without acknowledging an unfinished visual transition', async () => {
    const presentation = createCheckpointPresentation();
    presentation.begin(1);
    const controller = new AbortController();
    const pending = presentation.waitForCheckpoint(1, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow('bots.errors.stale');
    expect(vi.getTimerCount()).toBe(0);
    await expect(presentation.waitForCheckpoint(1, controller.signal)).rejects.toThrow('bots.errors.stale');
    const finished = vi.fn();
    const active = presentation.waitForCheckpoint(1).then(finished);
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    presentation.settle(1);
    await active;
  });

  it('releases hidden or reduced-motion views immediately until another checkpoint starts', async () => {
    const presentation = createCheckpointPresentation();
    presentation.begin(1);
    const waiting = presentation.waitForCheckpoint(1);
    presentation.release();
    await waiting;
    await presentation.waitForCheckpoint(2);
    expect(vi.getTimerCount()).toBe(0);
    presentation.begin(2);
    const finished = vi.fn();
    const visible = presentation.waitForCheckpoint(2).then(finished);
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    presentation.settle(2);
    await visible;
  });

  it('bounds lost-renderer waits without marking the checkpoint presented and clears all timers on disposal', async () => {
    const order: string[] = [];
    const presentation = createCheckpointPresentation({ timeoutMs: 500, onTimeout: () => order.push('cancel-motion') });
    presentation.begin(1);
    const finished = vi.fn();
    const waiting = presentation.waitForCheckpoint(1).then(() => {
      order.push('acknowledge');
      finished();
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(finished).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(order).toEqual(['cancel-motion', 'acknowledge']);
    expect(vi.getTimerCount()).toBe(0);
    const retry = presentation.waitForCheckpoint(1);
    expect(vi.getTimerCount()).toBe(1);
    presentation.dispose();
    await retry;
    await presentation.waitForCheckpoint(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('accepts a restarted worker checkpoint and does not retain invalid checkpoint waiters', async () => {
    const presentation = createCheckpointPresentation();
    presentation.begin(10);
    presentation.settle(10);
    presentation.begin(1);
    const finished = vi.fn();
    const restart = presentation.waitForCheckpoint(1).then(finished);
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    for (const invalid of [0, -1, 1.5, NaN, Infinity]) await presentation.waitForCheckpoint(invalid);
    expect(vi.getTimerCount()).toBe(1);
    presentation.settle(1);
    await restart;
  });
});

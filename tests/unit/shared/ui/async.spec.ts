import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const vueMocks = vi.hoisted(() => ({
  defineAsyncComponent: vi.fn((options) => options),
}));

vi.mock('vue', () => ({
  defineAsyncComponent: vueMocks.defineAsyncComponent,
}));

import { createAsyncComponent, isRetryableAsyncComponentError, loadAsyncImportWithRetry } from '@/shared/ui/async';
import { defineAsyncComponent } from 'vue';

const defineAsyncComponentMock = defineAsyncComponent as unknown as ReturnType<typeof vi.fn>;

describe('shared async UI helpers', () => {
  beforeEach(() => {
    defineAsyncComponentMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('identifies retryable async component import failures', () => {
    expect(
      isRetryableAsyncComponentError(new TypeError('Failed to fetch dynamically imported module: https://cdn/app.js'))
    ).toBe(true);
    expect(isRetryableAsyncComponentError('ChunkLoadError: Loading chunk 7 failed.')).toBe(true);
    expect(isRetryableAsyncComponentError(new Error('Network timeout'))).toBe(false);
    expect(isRetryableAsyncComponentError({ message: 'Loading chunk 7 failed.' })).toBe(false);
  });

  it('retries transient async imports with queue-microtask and timer backoff', async () => {
    vi.useFakeTimers();
    const queueMicrotaskMock = vi.fn((callback: VoidFunction) => callback());
    vi.stubGlobal('queueMicrotask', queueMicrotaskMock);

    let attempts = 0;
    const promise = loadAsyncImportWithRetry(
      async () => {
        attempts += 1;

        if (attempts < 3) {
          throw new TypeError('Loading chunk 42 failed.');
        }

        return { default: { name: 'RecoveredAsyncModule' } };
      },
      { maxAttempts: 3, retryDelayMs: 10 }
    );

    await Promise.resolve();

    expect(queueMicrotaskMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10);

    await expect(promise).resolves.toEqual({ default: { name: 'RecoveredAsyncModule' } });
    expect(attempts).toBe(3);
  });

  it('clamps max attempts to one and surfaces the original failure', async () => {
    const failure = new Error('permanent failure');
    const loader = vi.fn().mockRejectedValue(failure);

    await expect(loadAsyncImportWithRetry(loader, { maxAttempts: 0, retryDelayMs: 0 })).rejects.toBe(failure);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('creates async components that retry transient errors and fail exhausted loads', async () => {
    vi.useFakeTimers();
    const queueMicrotaskMock = vi.fn((callback: VoidFunction) => callback());
    vi.stubGlobal('queueMicrotask', queueMicrotaskMock);

    const loader = vi.fn().mockResolvedValue({ default: { name: 'AsyncBoundary' } });
    const component = createAsyncComponent(loader);
    const options = component as unknown as {
      loader: typeof loader;
      delay: number;
      suspensible: boolean;
      onError: (error: unknown, retry: () => void, fail: (error?: unknown) => void, attempts: number) => void;
    };

    expect(defineAsyncComponentMock).toHaveBeenCalledTimes(1);
    expect(options.loader).toBe(loader);
    expect(options.delay).toBe(0);
    expect(options.suspensible).toBe(false);

    const retry = vi.fn();
    const fail = vi.fn();
    const transientError = new TypeError('Failed to fetch dynamically imported module: https://cdn/widget.js');

    options.onError(transientError, retry, fail, 1);

    expect(queueMicrotaskMock).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(fail).not.toHaveBeenCalled();

    retry.mockClear();
    options.onError(transientError, retry, fail, 2);

    expect(retry).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(400);
    expect(retry).toHaveBeenCalledTimes(1);

    retry.mockClear();
    options.onError(transientError, retry, fail, 9);

    expect(retry).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledTimes(1);
  });
});

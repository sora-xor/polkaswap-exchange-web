import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAsyncComponent } from '@/utils/asyncComponent';
import { defineAsyncComponent } from 'vue';

vi.mock('vue', () => ({
  defineAsyncComponent: vi.fn((options) => options),
}));

const defineAsyncComponentMock = defineAsyncComponent as unknown as vi.Mock;

describe('utils/asyncComponent', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    defineAsyncComponentMock.mockClear();
  });

  it('wraps the provided loader', async () => {
    const loader = vi.fn().mockResolvedValue({ default: { name: 'Sample' } });
    const component = createAsyncComponent(loader);

    expect(defineAsyncComponentMock).toHaveBeenCalledTimes(1);

    const options = component as unknown as { loader: () => Promise<unknown> };
    await expect(options.loader()).resolves.toEqual({ default: { name: 'Sample' } });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('retries failed loads up to the configured attempts', async () => {
    vi.useFakeTimers();

    try {
      const loader = vi.fn().mockRejectedValue(new Error('network'));
      const component = createAsyncComponent(loader, { name: 'retry/component', retryAttempts: 2, retryDelay: 5 });
      const options = component as unknown as {
        loader: () => Promise<unknown>;
        onError: (error: unknown, retry: () => void, fail: (error: unknown) => void, attempts: number) => void;
      };

      const retry = vi.fn();
      const fail = vi.fn();
      options.onError(new Error('network'), retry, fail, 1);

      expect(retry).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5);
      expect(retry).toHaveBeenCalledTimes(1);
      expect(fail).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails immediately when retry attempts exhausted', () => {
    const loader = vi.fn().mockRejectedValue(new Error('permanent failure'));
    const component = createAsyncComponent(loader, { name: 'failing/component', retryAttempts: 2 });
    const options = component as unknown as {
      onError: (error: unknown, retry: () => void, fail: (error: unknown) => void, attempts: number) => void;
    };

    const retry = vi.fn();
    const fail = vi.fn();
    const error = new Error('permanent failure');

    options.onError(error, retry, fail, 2);

    expect(retry).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledTimes(1);
    expect(fail).toHaveBeenCalledWith(error);
  });
});

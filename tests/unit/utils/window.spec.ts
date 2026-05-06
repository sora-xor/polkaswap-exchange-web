import { afterEach, describe, expect, it, vi } from 'vitest';

describe('window utilities', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('delegates reloads to the current browser location', async () => {
    const reload = vi.fn();

    vi.stubGlobal('window', {
      location: {
        reload,
      },
    });

    const { reloadPage } = await import('@/utils/window');

    reloadPage();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

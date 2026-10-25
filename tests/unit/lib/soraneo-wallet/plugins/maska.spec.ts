import { describe, expect, it, vi } from 'vitest';

const pluginMocks = vi.hoisted(() => ({
  vMaska: { mounted: vi.fn(), updated: vi.fn() },
}));

vi.mock('maska/vue', () => ({
  vMaska: pluginMocks.vMaska,
}));

import { install } from '@/lib/soraneo-wallet/src/plugins/maska';

describe('wallet plugins/maska', () => {
  it('registers the maska directive on the app instance', () => {
    const app = {
      directive: vi.fn(),
    } as any;

    install(app);

    expect(app.directive).toHaveBeenCalledWith('maska', pluginMocks.vMaska);
  });
});

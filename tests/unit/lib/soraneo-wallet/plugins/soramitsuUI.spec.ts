import { describe, expect, it, vi } from 'vitest';

const walletPluginMocks = vi.hoisted(() => {
  const plugin = vi.fn();
  const pluginFactory = vi.fn(() => plugin);

  return {
    plugin,
    pluginFactory,
  };
});

vi.mock('@soramitsu-ui/ui', () => ({
  plugin: walletPluginMocks.pluginFactory,
}));

import { install } from '@/lib/soraneo-wallet/src/plugins/soramitsuUI';

describe('wallet soramitsuUI plugin', () => {
  it('installs the Soramitsu plugin and registers the wallet directives', () => {
    const app = {
      use: vi.fn(),
      directive: vi.fn(),
    } as any;

    install(app);

    expect(walletPluginMocks.pluginFactory).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(walletPluginMocks.plugin);
    expect(app.directive).toHaveBeenNthCalledWith(1, 'loading', expect.any(Object));
    expect(app.directive).toHaveBeenNthCalledWith(2, 'button', expect.any(Object));
  });
});

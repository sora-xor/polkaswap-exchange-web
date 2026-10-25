import { beforeEach, describe, expect, it, vi } from 'vitest';

const pluginMocks = vi.hoisted(() => ({
  installMaska: vi.fn(),
  installSoramitsuUI: vi.fn(),
  installVirtualScroller: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/plugins/maska', () => ({
  install: pluginMocks.installMaska,
}));

vi.mock('@/lib/soraneo-wallet/src/plugins/soramitsuUI', () => ({
  install: pluginMocks.installSoramitsuUI,
}));

vi.mock('@/lib/soraneo-wallet/src/plugins/virtualScroller', () => ({
  install: pluginMocks.installVirtualScroller,
}));

import installWalletPlugins from '@/lib/soraneo-wallet/src/plugins';

describe('wallet plugins/index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('installs wallet plugins without reinstalling soramitsu ui when the app already has it', () => {
    const components = {
      SButton: { name: 'SButton' },
      SDesignSystemProvider: { name: 'SDesignSystemProvider' },
    };
    const directives = {
      loading: { name: 'loading' },
      button: { name: 'button' },
    };
    const app = {
      component: vi.fn((name: keyof typeof components) => components[name]),
      directive: vi.fn((name: keyof typeof directives) => directives[name]),
    } as any;

    installWalletPlugins(app);

    expect(pluginMocks.installMaska).toHaveBeenCalledWith(app);
    expect(pluginMocks.installVirtualScroller).toHaveBeenCalledWith(app);
    expect(pluginMocks.installSoramitsuUI).not.toHaveBeenCalled();
  });

  it('installs soramitsu ui when one of the required components or directives is missing', () => {
    const components = {
      SButton: { name: 'SButton' },
    };
    const directives = {
      loading: { name: 'loading' },
    };
    const app = {
      component: vi.fn((name: keyof typeof components) => components[name]),
      directive: vi.fn((name: keyof typeof directives) => directives[name]),
    } as any;

    installWalletPlugins(app);

    expect(pluginMocks.installMaska).toHaveBeenCalledWith(app);
    expect(pluginMocks.installVirtualScroller).toHaveBeenCalledWith(app);
    expect(pluginMocks.installSoramitsuUI).toHaveBeenCalledWith(app);
  });
});

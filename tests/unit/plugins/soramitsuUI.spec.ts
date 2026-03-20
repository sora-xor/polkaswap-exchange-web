import { describe, expect, it, vi } from 'vitest';

const soramitsuPlugin = vi.fn();
const soramitsuPluginFactory = vi.fn(() => soramitsuPlugin);

vi.mock('@soramitsu-ui/ui', () => ({
  plugin: soramitsuPluginFactory,
}));

describe('soramitsuUI plugin', () => {
  it('registers the app-owned Soramitsu overrides without duplicate registration warnings', async () => {
    const contextComponents: Record<string, unknown> = {};
    const app = {
      use: vi.fn(),
      _context: { components: contextComponents },
      component: vi.fn(function (name: string, component?: unknown) {
        if (arguments.length === 1) return contextComponents[name];
        contextComponents[name] = component;
        return app;
      }),
    } as any;

    const { install } = await import('@/plugins/soramitsuUI');

    contextComponents.SMenu = { name: 'LegacySMenu' };
    contextComponents.SMenuItem = { name: 'LegacySMenuItem' };
    contextComponents.SMenuItemGroup = { name: 'LegacySMenuItemGroup' };
    contextComponents.STabs = { name: 'LegacySTabs' };
    contextComponents.STab = { name: 'LegacySTab' };

    install(app);

    expect(soramitsuPluginFactory).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(soramitsuPlugin);
    expect(contextComponents.SIcon).toEqual(expect.any(Object));
    expect(contextComponents['s-icon']).toEqual(expect.any(Object));
    expect(contextComponents.SMenu).toEqual(expect.any(Object));
    expect(contextComponents['s-menu']).toEqual(expect.any(Object));
    expect(contextComponents.SMenuItem).toEqual(expect.any(Object));
    expect(contextComponents['s-menu-item']).toEqual(expect.any(Object));
    expect(contextComponents.SMenuItemGroup).toEqual(expect.any(Object));
    expect(contextComponents['s-menu-item-group']).toEqual(expect.any(Object));
    expect(contextComponents.STabs).toEqual(expect.any(Object));
    expect(contextComponents['s-tabs']).toEqual(expect.any(Object));
    expect(contextComponents.STabsPanel).toEqual(expect.any(Object));
    expect(contextComponents['s-tabs-panel']).toEqual(expect.any(Object));
    expect(contextComponents.STab).toEqual(expect.any(Object));
    expect(contextComponents['s-tab']).toEqual(expect.any(Object));
  });
});

import { describe, expect, it, vi } from 'vitest';

const soramitsuPlugin = vi.fn();
const soramitsuPluginFactory = vi.fn(() => soramitsuPlugin);

vi.mock('@soramitsu-ui/ui', () => ({
  plugin: soramitsuPluginFactory,
}));

describe('soramitsuUI plugin', () => {
  it('registers and overrides legacy compat components without duplicate registration warnings', async () => {
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
    contextComponents.SDropdown = { name: 'LegacySDropdown' };
    contextComponents.SMenuItem = { name: 'LegacySMenuItem' };
    contextComponents.SMenuItemGroup = { name: 'LegacySMenuItemGroup' };

    install(app);

    expect(soramitsuPluginFactory).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(soramitsuPlugin);
    expect(contextComponents.ElPopover).toEqual(expect.any(Object));
    expect(contextComponents['el-popover']).toEqual(expect.any(Object));
    expect(contextComponents.SCollapse).toEqual(expect.any(Object));
    expect(contextComponents['s-collapse']).toEqual(expect.any(Object));
    expect(contextComponents.SCollapseItem).toEqual(expect.any(Object));
    expect(contextComponents['s-collapse-item']).toEqual(expect.any(Object));
    expect(contextComponents.SDropdown).toEqual(expect.any(Object));
    expect(contextComponents['s-dropdown']).toEqual(expect.any(Object));
    expect(contextComponents.SDropdownItem).toEqual(expect.any(Object));
    expect(contextComponents['s-dropdown-item']).toEqual(expect.any(Object));
    expect(contextComponents.SFloatInput).toEqual(expect.any(Object));
    expect(contextComponents['s-float-input']).toEqual(expect.any(Object));
    expect(contextComponents.SMenu).toEqual(expect.any(Object));
    expect(contextComponents['s-menu']).toEqual(expect.any(Object));
    expect(contextComponents.SMenuItem).toEqual(expect.any(Object));
    expect(contextComponents['s-menu-item']).toEqual(expect.any(Object));
    expect(contextComponents.SMenuItemGroup).toEqual(expect.any(Object));
    expect(contextComponents['s-menu-item-group']).toEqual(expect.any(Object));
  });
});

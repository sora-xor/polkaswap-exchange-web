import { describe, expect, it, vi } from 'vitest';
import { install } from '@/plugins/soramitsuUI';

describe('soramitsuUI plugin', () => {
  it('registers lazy app-owned Soramitsu components without duplicate registration warnings', async () => {
    const contextComponents: Record<string, unknown> = {};
    const contextDirectives: Record<string, unknown> = {};
    const app = {
      use: vi.fn(),
      _context: { components: contextComponents, directives: contextDirectives },
      component: vi.fn(function (name: string, component?: unknown) {
        if (arguments.length === 1) return contextComponents[name];
        contextComponents[name] = component;
        return app;
      }),
      directive: vi.fn(function (name: string, directive?: unknown) {
        if (arguments.length === 1) return contextDirectives[name];
        contextDirectives[name] = directive;
        return app;
      }),
    } as any;

    contextComponents.SMenu = { name: 'LegacySMenu' };
    contextComponents.SMenuItem = { name: 'LegacySMenuItem' };
    contextComponents.SMenuItemGroup = { name: 'LegacySMenuItemGroup' };
    contextComponents.STabs = { name: 'LegacySTabs' };
    contextComponents.STab = { name: 'LegacySTab' };

    install(app);

    expect(app.use).not.toHaveBeenCalled();
    expect(contextDirectives.loading).toEqual(expect.any(Object));
    expect(contextDirectives.button).toEqual(expect.any(Object));
    expect(contextComponents.SCard).toEqual(expect.any(Object));
    expect(contextComponents['s-card']).toEqual(expect.any(Object));
    expect(contextComponents.SDivider).toEqual(expect.any(Object));
    expect(contextComponents['s-divider']).toEqual(expect.any(Object));
    expect(contextComponents.SSlider).toEqual(expect.any(Object));
    expect(contextComponents['s-slider']).toEqual(expect.any(Object));
    expect(contextComponents.SIcon).toEqual(expect.any(Object));
    expect(contextComponents['s-icon']).toEqual(expect.any(Object));
    expect(contextComponents.SMenu).toEqual({ name: 'LegacySMenu' });
    expect(contextComponents['s-menu']).toEqual(expect.any(Object));
    expect(contextComponents.SMenuItem).toEqual({ name: 'LegacySMenuItem' });
    expect(contextComponents['s-menu-item']).toEqual(expect.any(Object));
    expect(contextComponents.SMenuItemGroup).toEqual({ name: 'LegacySMenuItemGroup' });
    expect(contextComponents['s-menu-item-group']).toEqual(expect.any(Object));
    expect(contextComponents.STabs).toEqual(expect.any(Object));
    expect(contextComponents['s-tabs']).toEqual(expect.any(Object));
    expect(contextComponents.STabsPanel).toEqual(expect.any(Object));
    expect(contextComponents['s-tabs-panel']).toEqual(expect.any(Object));
    expect(contextComponents.STab).toEqual({ name: 'LegacySTab' });
    expect(contextComponents['s-tab']).toEqual(expect.any(Object));
  }, 20_000);
});

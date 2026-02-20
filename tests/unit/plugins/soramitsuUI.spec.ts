import { describe, expect, it, vi } from 'vitest';

const soramitsuPlugin = vi.fn();
const soramitsuPluginFactory = vi.fn(() => soramitsuPlugin);

vi.mock('@soramitsu-ui/ui', () => ({
  plugin: soramitsuPluginFactory,
}));

describe('soramitsuUI plugin', () => {
  it('registers legacy compat component aliases', async () => {
    const app = {
      use: vi.fn(),
      component: vi.fn(),
    } as any;

    const { install } = await import('@/plugins/soramitsuUI');

    install(app);

    expect(soramitsuPluginFactory).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(soramitsuPlugin);
    expect(app.component).toHaveBeenCalledWith('ElPopover', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('el-popover', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('SCollapse', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('s-collapse', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('SCollapseItem', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('s-collapse-item', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('SDropdown', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('s-dropdown', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('SDropdownItem', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('s-dropdown-item', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('SFloatInput', expect.any(Object));
    expect(app.component).toHaveBeenCalledWith('s-float-input', expect.any(Object));
  });
});

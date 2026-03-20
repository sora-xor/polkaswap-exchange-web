import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Layout, LayoutWidget, ResponsiveLayouts } from '@/types/layout';

const layoutsStorageMock = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

vi.mock('@/utils/storage', () => {
  const createStorageStub = () => {
    const state: Record<string, string> = {};
    return {
      get: vi.fn((key: string) => state[key] ?? null),
      set: vi.fn((key: string, value: string) => {
        state[key] = value;
      }),
      remove: vi.fn((key: string) => {
        delete state[key];
      }),
    };
  };

  return {
    __esModule: true,
    default: createStorageStub(),
    settingsStorage: createStorageStub(),
    layoutsStorage: layoutsStorageMock,
    calculateStorageUsagePercentage: vi.fn(() => 0),
    clearLocalStorage: vi.fn(),
  };
});

vi.mock('@/lib/grid', () => {
  const GridLayout = defineComponent({
    name: 'GridLayoutStub',
    setup(_, { slots, attrs }) {
      return () => h('div', { ...attrs, class: ['grid-layout-stub', attrs.class as string] }, slots.default?.());
    },
  });

  const GridItem = defineComponent({
    name: 'GridItemStub',
    setup(_, { slots }) {
      return () => h('div', { class: 'grid-item-stub' }, slots.default?.());
    },
  });

  return {
    GridLayout,
    GridItem,
  };
});

let originalClientWidth: PropertyDescriptor | undefined;
let originalInnerWidth: PropertyDescriptor | undefined;

beforeAll(() => {
  originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 2200;
    },
  });

  originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 2200,
  });
});

afterAll(() => {
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  }
  if (originalInnerWidth) {
    Object.defineProperty(window, 'innerWidth', originalInnerWidth);
  }
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

const defaultLayouts: ResponsiveLayouts = {
  lg: [
    { i: 'widget-1', x: 0, y: 0, w: 6, h: 4 } as LayoutWidget,
    { i: 'widget-2', x: 6, y: 0, w: 6, h: 4 } as LayoutWidget,
  ],
};

const baseModel = {
  'widget-1': true,
  'widget-2': false,
};

let Grid: typeof import('@/components/shared/Widget/Grid.vue').default;

const mountGrid = async (props?: Record<string, unknown>) => {
  const wrapper = mount(Grid, {
    props: {
      gridId: 'test-grid',
      defaultLayouts,
      value: baseModel,
      ...props,
    },
  });

  await flushPromises();
  return wrapper;
};

describe('WidgetsGrid', () => {
  beforeEach(async () => {
    layoutsStorageMock.get.mockReset();
    layoutsStorageMock.set.mockReset();
    layoutsStorageMock.remove.mockReset();
    ({ default: Grid } = await import('@/components/shared/Widget/Grid.vue'));
  });

  it('emits widgets visibility model based on the active layout', async () => {
    const wrapper = await mountGrid();

    const emitted = wrapper.emitted('input') ?? [];
    expect(emitted.length).toBeGreaterThan(0);
    const [model] = emitted[emitted.length - 1];
    expect(Object.keys(wrapper.vm.layouts)).toContain('lg');
    expect((wrapper.vm.layouts.lg ?? []).length).toBeGreaterThan(0);
    expect((wrapper.props('defaultLayouts') as ResponsiveLayouts).lg?.length).toBeGreaterThan(0);
    expect(wrapper.vm.layout.length).toBeGreaterThan(0);
    expect(model).toEqual({
      'widget-1': true,
      'widget-2': false,
    });
  });

  it('supports modelValue/update:modelValue in addition to legacy value/input', async () => {
    const wrapper = await mountGrid({
      value: undefined,
      modelValue: baseModel,
    });

    const emittedModelValue = wrapper.emitted('update:modelValue') ?? [];
    expect(emittedModelValue.length).toBeGreaterThan(0);
    const [model] = emittedModelValue[emittedModelValue.length - 1];
    expect(model).toEqual({
      'widget-1': true,
      'widget-2': false,
    });
  });

  it('updates widget height while resizing and persists layouts', async () => {
    const wrapper = await mountGrid({ resizable: true });

    wrapper.vm.layout = [
      {
        i: 'widget-1',
        x: 0,
        y: 0,
        w: 4,
        h: 1,
        minH: 1,
      },
    ] as unknown as Layout;

    wrapper.vm.onResize('widget-1', { width: 0, height: 60 });
    expect(wrapper.vm.layout[0].h).toBeGreaterThan(1);

    const updatedLayout = [
      {
        i: 'widget-1',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        moved: true,
      },
    ] as unknown as Layout;

    wrapper.vm.onLayoutUpdate(updatedLayout);
    expect(layoutsStorageMock.set).toHaveBeenCalledWith('test-grid', expect.stringContaining('"widget-1"'));
  });

  it('does not persist layout-updated events while editing mode is disabled', async () => {
    const wrapper = await mountGrid({ resizable: false, draggable: false });
    layoutsStorageMock.set.mockClear();

    const updatedLayout = [
      {
        i: 'widget-1',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        moved: true,
      },
    ] as unknown as Layout;

    wrapper.vm.onLayoutUpdate(updatedLayout);
    expect(layoutsStorageMock.set).not.toHaveBeenCalled();
  });

  it('ignores auto-resize updates when editing mode is disabled', async () => {
    const wrapper = await mountGrid({ resizable: false });

    wrapper.vm.layout = [
      {
        i: 'widget-1',
        x: 0,
        y: 0,
        w: 4,
        h: 10,
        minH: 1,
      },
    ] as unknown as Layout;

    wrapper.vm.onResize('widget-1', { width: 0, height: 400 });
    expect(wrapper.vm.layout[0].h).toBe(10);
  });

  it('updates widget height from content changes when autoResize is enabled', async () => {
    const wrapper = await mountGrid({ resizable: false, autoResize: true });

    wrapper.vm.layout = [
      {
        i: 'widget-1',
        x: 0,
        y: 0,
        w: 4,
        h: 10,
        minH: 1,
      },
    ] as unknown as Layout;

    wrapper.vm.onResize('widget-1', { width: 0, height: 400 });
    expect(wrapper.vm.layout[0].h).toBeGreaterThan(10);
  });

  it('stores layouts under CID-scoped key on IPFS paths', async () => {
    window.history.replaceState({}, '', '/ipfs/QmUnitTestCid/index.html');
    const wrapper = await mountGrid({ resizable: true });

    const updatedLayout = [
      {
        i: 'widget-1',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        moved: true,
      },
    ] as unknown as Layout;

    wrapper.vm.onLayoutUpdate(updatedLayout);

    expect(layoutsStorageMock.set).toHaveBeenCalledWith(
      'QmUnitTestCid::test-grid',
      expect.stringContaining('"widget-1"')
    );
  });

  it('ignores layout updates that exceed current breakpoint column bounds', async () => {
    const wrapper = await mountGrid();

    // Force a smaller breakpoint so the next layout would be invalid.
    wrapper.vm.breakpoint = 'sm';
    layoutsStorageMock.set.mockClear();

    const invalidLayout = [
      {
        i: 'widget-1',
        x: 11,
        y: 0,
        w: 8,
        h: 2,
        moved: true,
      },
    ] as unknown as Layout;

    wrapper.vm.onLayoutUpdate(invalidLayout);

    expect(layoutsStorageMock.set).not.toHaveBeenCalled();
  });

  it('falls back to defaults when stored layouts payload is invalid', async () => {
    window.history.replaceState({}, '', '/ipfs/QmBrokenCid/index.html');
    layoutsStorageMock.get.mockReturnValueOnce('{"not-valid-json"');

    const wrapper = await mountGrid();

    expect(layoutsStorageMock.remove).toHaveBeenCalledWith('QmBrokenCid::test-grid');
    const emitted = wrapper.emitted('input') ?? [];
    expect(emitted.length).toBeGreaterThan(0);
  });

  it('normalizes stored layouts against default constraints', async () => {
    const constrainedLayouts: ResponsiveLayouts = {
      lg: [{ i: 'customise', x: 0, y: 0, w: 6, h: 3, minW: 2, minH: 3, maxH: 3 }],
    };
    const brokenStoredLayouts: ResponsiveLayouts = {
      lg: [{ i: 'customise', x: -5, y: -8, w: 30, h: 30, minW: 2, minH: 3 }],
    };
    layoutsStorageMock.get.mockReturnValueOnce(JSON.stringify(brokenStoredLayouts));

    const wrapper = await mountGrid({
      defaultLayouts: constrainedLayouts,
      value: { customise: true },
    });

    expect(wrapper.vm.layouts.lg).toEqual([
      {
        i: 'customise',
        x: 0,
        y: 0,
        w: 24,
        h: 3,
        minW: 2,
        minH: 3,
        maxH: 3,
      },
    ]);
    expect(layoutsStorageMock.set).toHaveBeenCalledWith('test-grid', expect.stringContaining('"customise"'));
  });

  it('toggles editing class only while widget editing is enabled', async () => {
    const wrapper = await mountGrid({ draggable: false, resizable: false });

    const grid = wrapper.find('.grid-layout-stub');
    expect(grid.classes()).toContain('widgets-grid');
    expect(grid.classes()).not.toContain('widgets-grid--editing');

    await wrapper.setProps({ draggable: true });
    await flushPromises();
    expect(wrapper.find('.grid-layout-stub').classes()).toContain('widgets-grid--editing');
  });

  it('adds the auto-resize class when content-driven widget resizing is enabled', async () => {
    const wrapper = await mountGrid({ autoResize: true });

    expect(wrapper.find('.grid-layout-stub').classes()).toContain('widgets-grid--auto-resize');

    await wrapper.setProps({ autoResize: false });
    await flushPromises();
    expect(wrapper.find('.grid-layout-stub').classes()).not.toContain('widgets-grid--auto-resize');
  });

  it('keeps auto-resize grids in settling mode until the initial layout is ready', async () => {
    const wrapper = await mountGrid({ autoResize: true });
    const gridLayout = wrapper.findComponent({ name: 'GridLayoutStub' });

    expect(gridLayout.classes()).toContain('widgets-grid--layout-settling');

    gridLayout.vm.$emit('layout-ready');
    await flushPromises();

    expect(gridLayout.classes()).not.toContain('widgets-grid--layout-settling');
  });
});

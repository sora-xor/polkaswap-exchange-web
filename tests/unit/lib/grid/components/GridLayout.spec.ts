import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import GridLayout from '@/lib/grid/components/GridLayout.vue';
import type { Layout } from '@/lib/grid/types';

const createLayout = (): Layout => [
  {
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    i: 'swap-form',
  },
];

describe('GridLayout', () => {
  let originalOffsetWidth: PropertyDescriptor | undefined;
  let offsetWidth = 1400;

  beforeEach(() => {
    originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return offsetWidth;
      },
    });
  });

  afterEach(() => {
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    } else {
      delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
    }
    offsetWidth = 1400;
  });

  it('ignores nested layout item mutations to avoid recursive compaction updates', async () => {
    const layout = ref<Layout>(createLayout());

    const Host = defineComponent({
      name: 'GridLayoutHost',
      setup() {
        return () => h(GridLayout, { layout: layout.value });
      },
    });

    const wrapper = mount(Host, {
      global: {
        stubs: {
          GridItem: defineComponent({
            name: 'GridItem',
            setup() {
              return () => h('div');
            },
          }),
        },
      },
    });

    await flushPromises();
    await nextTick();

    const gridLayout = wrapper.findComponent(GridLayout);
    const initialUpdateEvents = gridLayout.emitted('layout-updated')?.length ?? 0;

    layout.value[0].y = 4;
    await nextTick();
    await flushPromises();

    expect(layout.value[0].y).toBe(4);
    expect(gridLayout.emitted('layout-updated')?.length ?? 0).toBe(initialUpdateEvents);
  });

  it('recomputes the responsive layout when the grid width changes', async () => {
    const layout = ref<Layout>([{ x: 6, y: 0, w: 6, h: 4, i: 'chart' }]);
    const responsiveLayouts = {
      lg: [{ x: 6, y: 0, w: 6, h: 4, i: 'chart' }],
      xss: [{ x: 0, y: 0, w: 4, h: 4, i: 'chart' }],
    };

    const Host = defineComponent({
      name: 'ResponsiveGridLayoutHost',
      setup() {
        return () =>
          h(GridLayout, {
            layout: layout.value,
            responsive: true,
            responsiveLayouts,
            breakpoints: { lg: 1200, xss: 0 },
            cols: { lg: 12, xss: 4 },
            'onUpdate:layout': (nextLayout: Layout) => {
              layout.value = nextLayout;
            },
          });
      },
    });

    const wrapper = mount(Host, {
      global: {
        stubs: {
          GridItem: defineComponent({
            name: 'GridItem',
            setup() {
              return () => h('div');
            },
          }),
        },
      },
    });

    await flushPromises();
    await nextTick();

    offsetWidth = 390;
    window.dispatchEvent(new Event('resize'));
    await flushPromises();
    await nextTick();

    const gridLayout = wrapper.findComponent(GridLayout);
    const breakpointEvents = gridLayout.emitted('breakpoint-changed') ?? [];
    const lastBreakpointEvent = breakpointEvents.at(-1) ?? [];

    expect(lastBreakpointEvent[0]).toBe('xss');
    expect(layout.value).toEqual([
      expect.objectContaining({
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        i: 'chart',
      }),
    ]);
  });
});

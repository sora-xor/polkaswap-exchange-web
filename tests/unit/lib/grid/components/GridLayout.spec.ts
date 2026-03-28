import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

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
});

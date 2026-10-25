import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/composables/prop-type-filter', async () => {
  const { computed } = await import('vue');

  return {
    usePropTypeFilter:
      <T extends Record<string, unknown>>(props: T) =>
      <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
        computed(() => (values.includes(props[key]) ? props[key] : fallback)),
  };
});

import SCol from '@/lib/soramitsu-ui/components/Col/SCol.vue';
import { ROW_INJECTION_KEY } from '@/lib/soramitsu-ui/components/Row/context';
import SRow from '@/lib/soramitsu-ui/components/Row/SRow.vue';

describe('SRow', () => {
  it('uses default alignment, wrapping, and zero gutter styles', () => {
    const wrapper = mount(SRow);
    const style = wrapper.attributes('style');

    expect(style).toContain('--s-row-gutter: 0px');
    expect(style).not.toContain('margin-left');
    expect(style).not.toContain('margin-right');
    expect(style).toContain('justify-content: flex-start');
    expect(style).toContain('align-items: flex-start');
    expect(style).toContain('flex-wrap: wrap');
  });

  it('applies gutter, justify, align, and wrap styles', () => {
    const wrapper = mount(SRow, {
      props: {
        gutter: 16,
        justify: 'space-between',
        align: 'middle',
        wrap: false,
      },
      slots: {
        default: '<div class="row-child" />',
      },
    });
    const style = wrapper.attributes('style');

    expect(wrapper.classes()).toContain('s-row');
    expect(wrapper.find('.row-child').exists()).toBe(true);
    expect(style).toContain('--s-row-gutter: 16px');
    expect(style).toContain('margin-left: -8px');
    expect(style).toContain('margin-right: -8px');
    expect(style).toContain('justify-content: space-between');
    expect(style).toContain('align-items: center');
    expect(style).toContain('flex-wrap: nowrap');
  });

  it('falls back invalid alignment props and provides gutter to child columns', () => {
    const wrapper = mount(SRow, {
      props: {
        gutter: 20,
        justify: 'invalid',
        align: 'invalid',
      },
    });
    const col = mount(SCol, {
      global: {
        provide: {
          [ROW_INJECTION_KEY as symbol]: {
            gutter: ref(20),
          },
        },
      },
    });
    const rowStyle = wrapper.attributes('style');
    const colStyle = col.attributes('style');

    expect(rowStyle).toContain('justify-content: flex-start');
    expect(rowStyle).toContain('align-items: flex-start');
    expect(colStyle).toContain('--s-col-gutter: 20px');
    expect(colStyle).toContain('padding-left: 10px');
    expect(colStyle).toContain('padding-right: 10px');
  });

  it('maps remaining justify and align values', () => {
    const wrapper = mount(SRow, {
      props: {
        justify: 'space-around',
        align: 'bottom',
      },
    });
    const style = wrapper.attributes('style');

    expect(style).toContain('justify-content: space-around');
    expect(style).toContain('align-items: flex-end');
  });
});
